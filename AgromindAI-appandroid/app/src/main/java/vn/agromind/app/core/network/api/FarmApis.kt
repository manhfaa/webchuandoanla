package vn.agromind.app.core.network.api

import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import vn.agromind.app.core.network.dto.AgriculturalInputDto
import vn.agromind.app.core.network.dto.CreateOrderRequest
import vn.agromind.app.core.network.dto.CreateOrderResponseDto
import vn.agromind.app.core.network.dto.CropDto
import vn.agromind.app.core.network.dto.CropPlanCreateRequest
import vn.agromind.app.core.network.dto.CropPlanDetailDto
import vn.agromind.app.core.network.dto.CropPlanListItemDto
import vn.agromind.app.core.network.dto.CropPlanStepDto
import vn.agromind.app.core.network.dto.CultivationLogDto
import vn.agromind.app.core.network.dto.CultivationLogWriteDto
import vn.agromind.app.core.network.dto.FarmAdvisoryDto
import vn.agromind.app.core.network.dto.FarmLocationDto
import vn.agromind.app.core.network.dto.FarmPlotDto
import vn.agromind.app.core.network.dto.FarmPlotWriteDto
import vn.agromind.app.core.network.dto.OrderDetailDto
import vn.agromind.app.core.network.dto.PageDto
import vn.agromind.app.core.network.dto.PaymentOrderDto
import vn.agromind.app.core.network.dto.PlayProductDto
import vn.agromind.app.core.network.dto.PlayVerifyRequest
import vn.agromind.app.core.network.dto.PlayVerifyResponseDto
import vn.agromind.app.core.network.dto.ReconcileRequest
import vn.agromind.app.core.network.dto.ReminderDto
import vn.agromind.app.core.network.dto.ReminderReadRequest
import vn.agromind.app.core.network.dto.StepDelayRequest
import vn.agromind.app.core.network.dto.StepNoteRequest
import vn.agromind.app.core.network.dto.SubscriptionSummaryDto
import vn.agromind.app.core.network.dto.TraceabilityDto
import vn.agromind.app.core.network.dto.WeatherDto

interface FarmApi {

    @GET("api/farm-locations/")
    suspend fun locations(): List<FarmLocationDto>

    @GET("api/farm-plots/")
    suspend fun plots(): List<FarmPlotDto>

    @POST("api/farm-plots/")
    suspend fun createPlot(@Body body: FarmPlotWriteDto): FarmPlotDto

    @PATCH("api/farm-plots/{id}/")
    suspend fun updatePlot(@Path("id") id: Int, @Body body: FarmPlotWriteDto): FarmPlotDto

    @DELETE("api/farm-plots/{id}/")
    suspend fun deletePlot(@Path("id") id: Int)

    @GET("api/cultivation-logs/")
    suspend fun logs(@Query("plot") plotId: Int): List<CultivationLogDto>

    @POST("api/cultivation-logs/")
    suspend fun createLog(@Body body: CultivationLogWriteDto): CultivationLogDto

    @DELETE("api/cultivation-logs/{id}/")
    suspend fun deleteLog(@Path("id") id: Int)

    @GET("api/traceability/")
    suspend fun traceability(): List<TraceabilityDto>

    /**
     * Weather by coordinates.
     *
     * The app sends lat/lon to Django and Django calls Open-Meteo. It never
     * calls a weather provider itself — that keeps one cache, one rate limit and
     * one place where the pest rules are evaluated.
     */
    @GET("api/weather/")
    suspend fun weather(
        @Query("lat") lat: Double,
        @Query("lon") lon: Double,
    ): WeatherDto

    @GET("api/farm-advisory/")
    suspend fun advisory(
        @Query("location") locationId: Int? = null,
        @Query("crop") crop: String? = null,
    ): FarmAdvisoryDto

    @GET("api/input-library/")
    suspend fun inputLibrary(
        @Query("q") query: String? = null,
        @Query("category") category: String? = null,
        @Query("crop") crop: String? = null,
    ): List<AgriculturalInputDto>
}

interface CropPlanApi {

    @GET("api/crop-plans/crops/")
    suspend fun crops(): List<CropDto>

    /** Runs the planner and returns the plan **without saving it or spending quota**. */
    @POST("api/crop-plans/plans/preview/")
    suspend fun preview(@Body body: CropPlanCreateRequest): CropPlanDetailDto

    @GET("api/crop-plans/plans/")
    suspend fun plans(
        @Query("page") page: Int = 1,
        @Query("page_size") pageSize: Int = 20,
    ): PageDto<CropPlanListItemDto>

    @POST("api/crop-plans/plans/")
    suspend fun create(@Body body: CropPlanCreateRequest): CropPlanDetailDto

    @GET("api/crop-plans/plans/{id}/")
    suspend fun plan(@Path("id") id: Int): CropPlanDetailDto

    @DELETE("api/crop-plans/plans/{id}/")
    suspend fun deletePlan(@Path("id") id: Int)

    @POST("api/crop-plans/steps/{id}/complete/")
    suspend fun completeStep(@Path("id") id: Int, @Body body: StepNoteRequest = StepNoteRequest()): CropPlanStepDto

    @POST("api/crop-plans/steps/{id}/reopen/")
    suspend fun reopenStep(@Path("id") id: Int, @Body body: StepNoteRequest = StepNoteRequest()): CropPlanStepDto

    @POST("api/crop-plans/steps/{id}/delay/")
    suspend fun delayStep(@Path("id") id: Int, @Body body: StepDelayRequest): CropPlanStepDto

    @POST("api/crop-plans/steps/{id}/notes/")
    suspend fun noteStep(@Path("id") id: Int, @Body body: StepNoteRequest): CropPlanStepDto

    @GET("api/crop-plans/reminders/")
    suspend fun reminders(
        @Query("filter") filter: String? = null,
        @Query("page") page: Int = 1,
        @Query("page_size") pageSize: Int = 50,
    ): PageDto<ReminderDto>

    @PATCH("api/crop-plans/reminders/{id}/read/")
    suspend fun markReminderRead(
        @Path("id") id: Int,
        @Body body: ReminderReadRequest = ReminderReadRequest(),
    ): ReminderDto
}

interface PaymentApi {

    @GET("api/payments/subscription/")
    suspend fun subscription(): SubscriptionSummaryDto

    @GET("api/payments/orders/")
    suspend fun orders(): List<PaymentOrderDto>

    @POST("api/payments/orders/")
    suspend fun createOrder(@Body body: CreateOrderRequest): CreateOrderResponseDto

    @GET("api/payments/orders/{id}/")
    suspend fun order(@Path("id") id: String): OrderDetailDto

    /** For an order that received money but cannot settle itself: overpaid, late, partial. */
    @POST("api/payments/orders/{id}/reconcile/")
    suspend fun reconcile(@Path("id") id: String, @Body body: ReconcileRequest): OrderDetailDto

    /* ------------------------------------------------------ Google Play --- */

    @GET("api/payments/google-play/products/")
    suspend fun playProducts(): List<PlayProductDto>

    @POST("api/payments/google-play/verify/")
    suspend fun verifyPlayPurchase(@Body body: PlayVerifyRequest): PlayVerifyResponseDto
}
