package vn.agromind.app.core.security

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.first
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import javax.inject.Inject
import javax.inject.Singleton

/** The pair the app holds. Never logged, never put in a URL, never in an intent. */
@Serializable
data class SessionTokens(val access: String, val refresh: String)

private val Context.sessionStore: DataStore<Preferences> by preferencesDataStore(name = "agromind_session")

/**
 * Where the JWT pair lives on the device.
 *
 * Plain `SharedPreferences` or a plain DataStore would put a working refresh
 * token — seven days of access to the grower's account — in a file that anything
 * with a root shell, an ADB backup or a device-level compromise can read. So the
 * blob is encrypted with an AES-256/GCM key generated inside the Android
 * Keystore and marked non-exportable: the ciphertext can be copied off the
 * device, but the key cannot, so the copy is worthless elsewhere.
 *
 * The key is deliberately *not* bound to user authentication. Requiring a
 * device unlock to decrypt would mean a scheduled sync or a notification tap
 * could not refresh the session, and the grower would be signed out for reasons
 * that look random to them.
 *
 * If decryption ever fails — key invalidated because the screen lock changed,
 * app data restored onto another device — the stored blob is dropped and the
 * grower signs in again. That is the correct outcome: unreadable ciphertext is
 * not a session.
 */
@Singleton
class SecureTokenStore @Inject constructor(
    @ApplicationContext private val context: Context,
) {

    private val json = Json { ignoreUnknownKeys = true }

    suspend fun read(): SessionTokens? {
        val stored = context.sessionStore.data.first()[BLOB] ?: return null
        return runCatching { json.decodeFromString<SessionTokens>(decrypt(stored)) }
            .getOrElse {
                clear()
                null
            }
    }

    suspend fun write(tokens: SessionTokens) {
        val payload = encrypt(json.encodeToString(SessionTokens.serializer(), tokens))
        context.sessionStore.edit { it[BLOB] = payload }
    }

    suspend fun clear() {
        context.sessionStore.edit { it.remove(BLOB) }
    }

    /* ------------------------------------------------------------ crypto --- */

    private fun secretKey(): SecretKey {
        val keyStore = KeyStore.getInstance(PROVIDER).apply { load(null) }
        (keyStore.getEntry(KEY_ALIAS, null) as? KeyStore.SecretKeyEntry)?.let { return it.secretKey }

        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, PROVIDER).apply {
            init(
                KeyGenParameterSpec.Builder(
                    KEY_ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
                )
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setKeySize(256)
                    // Kept usable while the device is locked; see class comment.
                    .setUserAuthenticationRequired(false)
                    .build(),
            )
        }.generateKey()
    }

    private fun encrypt(plain: String): String {
        val cipher = Cipher.getInstance(TRANSFORMATION).apply { init(Cipher.ENCRYPT_MODE, secretKey()) }
        val encrypted = cipher.doFinal(plain.toByteArray(Charsets.UTF_8))
        // GCM needs a fresh IV per message and it is not secret, so it is stored
        // in front of the ciphertext rather than derived or reused.
        val packed = cipher.iv + encrypted
        return Base64.encodeToString(packed, Base64.NO_WRAP)
    }

    private fun decrypt(stored: String): String {
        val packed = Base64.decode(stored, Base64.NO_WRAP)
        val iv = packed.copyOfRange(0, IV_BYTES)
        val body = packed.copyOfRange(IV_BYTES, packed.size)
        val cipher = Cipher.getInstance(TRANSFORMATION).apply {
            init(Cipher.DECRYPT_MODE, secretKey(), GCMParameterSpec(TAG_BITS, iv))
        }
        return String(cipher.doFinal(body), Charsets.UTF_8)
    }

    private companion object {
        const val PROVIDER = "AndroidKeyStore"
        const val KEY_ALIAS = "agromind.session.v1"
        const val TRANSFORMATION = "AES/GCM/NoPadding"
        const val IV_BYTES = 12
        const val TAG_BITS = 128
        val BLOB = stringPreferencesKey("session_blob")
    }
}
