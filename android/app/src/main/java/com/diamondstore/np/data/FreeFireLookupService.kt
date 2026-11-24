package com.diamondstore.np.data

import com.diamondstore.np.model.UidLookupResult
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

object FreeFireLookupService {
    private val client = OkHttpClient.Builder()
        .connectTimeout(5, TimeUnit.SECONDS)
        .readTimeout(6, TimeUnit.SECONDS)
        .build()

    private val regions = listOf("BD", "IND", "SG")
    private val jsonMedia = "application/json; charset=utf-8".toMediaType()
    private const val BROWSER_UA =
        "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"

    private fun queryLiveChecker(uid: String): UidLookupResult? {
        val jar = linkedMapOf<String, String>()
        fun collectCookies(headers: okhttp3.Headers) {
            for (raw in headers.values("Set-Cookie")) {
                val pair = raw.substringBefore(';').trim()
                val eq = pair.indexOf('=')
                if (eq > 0) {
                    jar[pair.substring(0, eq).trim()] = pair.substring(eq + 1).trim()
                }
            }
        }
        fun cookieHeader(): String = jar.entries.joinToString("; ") { "${it.key}=${it.value}" }

        return try {
            val csrfReq = Request.Builder()
                .url("https://gameskinbo.com/api/csrf-token")
                .header("Accept", "application/json")
                .header("Origin", "https://gameskinbo.com")
                .header("Referer", "https://gameskinbo.com/free_fire_id_checker")
                .header("User-Agent", BROWSER_UA)
                .get()
                .build()
            val csrfToken = client.newCall(csrfReq).execute().use { res ->
                if (!res.isSuccessful) return null
                collectCookies(res.headers)
                val body = res.body?.string() ?: return null
                val json = JSONObject(body)
                json.optString("token").ifBlank { json.optString("csrfToken") }
            }
            if (csrfToken.isBlank()) return null

            val payload = JSONObject().put("uid", uid).toString()
            val sessionReq = Request.Builder()
                .url("https://gameskinbo.com/api/ff_id_checker/session")
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .header("Origin", "https://gameskinbo.com")
                .header("Referer", "https://gameskinbo.com/free_fire_id_checker")
                .header("User-Agent", BROWSER_UA)
                .header("x-api-client", "gameskinbo-web")
                .header("x-csrf-token", csrfToken)
                .header("Cookie", cookieHeader())
                .post(payload.toRequestBody(jsonMedia))
                .build()
            val checkerToken = client.newCall(sessionReq).execute().use { res ->
                if (!res.isSuccessful) return null
                collectCookies(res.headers)
                val body = res.body?.string() ?: return null
                JSONObject(body).optString("token")
            }
            if (checkerToken.isBlank()) return null

            val infoReq = Request.Builder()
                .url("https://gameskinbo.com/api/ff_id_checker")
                .header("Accept", "application/json")
                .header("Content-Type", "application/json")
                .header("Origin", "https://gameskinbo.com")
                .header("Referer", "https://gameskinbo.com/free_fire_id_checker")
                .header("User-Agent", BROWSER_UA)
                .header("x-api-client", "gameskinbo-web")
                .header("x-ff-id-checker-token", checkerToken)
                .header("x-csrf-token", csrfToken)
                .header("Cookie", cookieHeader())
                .post(payload.toRequestBody(jsonMedia))
                .build()
            client.newCall(infoReq).execute().use { res ->
                if (!res.isSuccessful) return null
                val body = res.body?.string() ?: return null
                val json = JSONObject(body)
                val nickname = json.optString("name")
                    .ifBlank { json.optString("nickname") }
                    .trim()
                val region = json.optString("region").trim().uppercase().ifBlank { "BD" }
                if (nickname.length >= 2) {
                    UidLookupResult(
                        found = true,
                        busy = false,
                        uid = uid,
                        ign = nickname.take(64),
                        region = region,
                        message = "Verified on $region server"
                    )
                } else null
            }
        } catch (_: Exception) {
            null
        }
    }

    suspend fun lookupUid(rawUid: String): UidLookupResult = withContext(Dispatchers.IO) {
        val uid = rawUid.filter { it.isDigit() }
        if (uid.length < 5 || uid.length > 20) {
            return@withContext UidLookupResult(
                found = false,
                busy = false,
                uid = uid,
                ign = "",
                region = "",
                message = "Player UID must be 5 to 20 digits."
            )
        }

        queryLiveChecker(uid)?.let { return@withContext it }

        for (region in regions) {
            val urls = listOf(
                "https://freefire-api-six.vercel.app/get_player_personal_show?server=$region&uid=$uid",
                "https://ff-info-api.vercel.app/api/player?region=$region&uid=$uid"
            )
            for (url in urls) {
                try {
                    val req = Request.Builder().url(url).get().build()
                    client.newCall(req).execute().use { res ->
                        if (!res.isSuccessful) return@use
                        val body = res.body?.string() ?: return@use
                        val json = JSONObject(body)
                        val info = json.optJSONObject("basicinfo")
                            ?: json.optJSONObject("basicInfo")
                            ?: json.optJSONObject("AccountInfo")
                            ?: json.optJSONObject("data")
                            ?: json
                        val nickname = info.optString("nickname")
                            .ifBlank { info.optString("AccountName") }
                            .ifBlank { info.optString("name") }
                            .trim()
                        if (nickname.length >= 2) {
                            return@withContext UidLookupResult(
                                found = true,
                                busy = false,
                                uid = uid,
                                ign = nickname.take(64),
                                region = region,
                                message = "Verified on $region server"
                            )
                        }
                    }
                } catch (_: Exception) {
                    // Try next server/endpoint; never fabricate placeholder IGNs
                }
            }
        }

        UidLookupResult(
            found = false,
            busy = true,
            uid = uid,
            ign = "",
            region = "",
            message = "Lookup server busy across BD/IND/SG — you can confirm with your Player UID alone."
        )
    }
}
