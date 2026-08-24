package vn.agromind.app.core.common

/**
 * Success or a typed [AgroError].
 *
 * Kotlin's own `Result` carries a `Throwable`, which pushes every caller into
 * `is IOException` / `is HttpException` checks and loses the 402 payload the
 * upgrade screen needs. Repositories return this instead, so a ViewModel maps
 * states rather than exceptions.
 */
sealed interface AgroResult<out T> {

    data class Ok<T>(val value: T) : AgroResult<T>

    data class Err(val error: AgroError) : AgroResult<Nothing>

    val valueOrNull: T? get() = (this as? Ok)?.value
    val errorOrNull: AgroError? get() = (this as? Err)?.error
    val isOk: Boolean get() = this is Ok
}

inline fun <T, R> AgroResult<T>.map(transform: (T) -> R): AgroResult<R> = when (this) {
    is AgroResult.Ok -> AgroResult.Ok(transform(value))
    is AgroResult.Err -> this
}

inline fun <T> AgroResult<T>.onOk(action: (T) -> Unit): AgroResult<T> = apply {
    if (this is AgroResult.Ok) action(value)
}

inline fun <T> AgroResult<T>.onErr(action: (AgroError) -> Unit): AgroResult<T> = apply {
    if (this is AgroResult.Err) action(error)
}
