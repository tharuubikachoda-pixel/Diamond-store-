package com.diamondstore.np.ui.screens

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.filled.PhotoLibrary
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.diamondstore.np.data.FreeFireLookupService
import com.diamondstore.np.model.*
import com.diamondstore.np.ui.components.FullscreenZoomDialog
import com.diamondstore.np.ui.components.PaymentQrCard
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CheckoutSheet(
    pkg: DiamondPackage,
    profile: UserProfile,
    settings: StoreSettings,
    onDismiss: () -> Unit,
    onSubmitOrder: suspend (
        playerUid: String,
        playerIgn: String,
        playerRegion: String,
        ignVerified: Boolean,
        method: String,
        screenshotDataUrl: String
    ) -> Unit
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var playerUid by remember { mutableStateOf(profile.defaultUid.ifBlank { profile.recentUids.firstOrNull().orEmpty() }) }
    var lookupLoading by remember { mutableStateOf(false) }
    var lookupResult by remember { mutableStateOf<UidLookupResult?>(null) }
    var paymentMethod by remember { mutableStateOf("esewa") }
    var screenshotDataUrl by remember { mutableStateOf("") }
    var previewBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var zoomPreviewOpen by remember { mutableStateOf(false) }
    var submitting by remember { mutableStateOf(false) }
    var errorMsg by remember { mutableStateOf<String?>(null) }

    fun handlePickedUri(uri: Uri?) {
        if (uri == null) return
        context.contentResolver.openInputStream(uri)?.use { stream ->
            val raw = BitmapFactory.decodeStream(stream) ?: return
            val ratio = minOf(960f / raw.width, 960f / raw.height, 1f)
            val scaled = Bitmap.createScaledBitmap(
                raw,
                (raw.width * ratio).toInt().coerceAtLeast(1),
                (raw.height * ratio).toInt().coerceAtLeast(1),
                true
            )
            val out = ByteArrayOutputStream()
            scaled.compress(Bitmap.CompressFormat.JPEG, 78, out)
            val b64 = Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP)
            screenshotDataUrl = "data:image/jpeg;base64,$b64"
            previewBitmap = scaled
        }
    }

    val pickVisualMediaLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.PickVisualMedia()
    ) { uri -> handlePickedUri(uri) }

    val openDocumentLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri -> handlePickedUri(uri) }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 12.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            Text(
                text = "${pkg.name} · Rs ${pkg.priceNpr}",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold
            )

            // Numeric UID Input + Search Button (NO Paste buttons, NO manual IGN input)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedTextField(
                    value = playerUid,
                    onValueChange = { input ->
                        val clean = input.filter { it.isDigit() }.take(20)
                        playerUid = clean
                        if (lookupResult?.uid != clean) lookupResult = null
                    },
                    label = { Text("Player UID (Numeric)") },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    singleLine = true,
                    modifier = Modifier.weight(1f)
                )
                Button(
                    onClick = {
                        scope.launch {
                            lookupLoading = true
                            lookupResult = FreeFireLookupService.lookupUid(playerUid)
                            lookupLoading = false
                        }
                    },
                    enabled = !lookupLoading && playerUid.length >= 5,
                    modifier = Modifier.height(54.dp)
                ) {
                    Icon(Icons.Default.Search, contentDescription = "Search UID")
                    Spacer(Modifier.width(4.dp))
                    Text(if (lookupLoading) "..." else "Search")
                }
            }

            // Recent UID chips
            if (profile.recentUids.isNotEmpty()) {
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    profile.recentUids.forEach { recent ->
                        SuggestionChip(
                            onClick = {
                                playerUid = recent
                                scope.launch {
                                    lookupLoading = true
                                    lookupResult = FreeFireLookupService.lookupUid(recent)
                                    lookupLoading = false
                                }
                            },
                            label = { Text(recent) }
                        )
                    }
                }
            }

            lookupResult?.let { res ->
                if (res.found) {
                    Card(
                        colors = CardDefaults.cardColors(containerColor = Color(0x2210B981))
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Icon(Icons.Default.CheckCircle, contentDescription = null, tint = Color(0xFF10B981))
                            Text("Verified IGN: ${res.ign} (${res.region})", fontWeight = FontWeight.Bold)
                        }
                    }
                } else {
                    Text(
                        text = res.message,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Payment Method Selector (eSewa + Wallet only)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                listOf("esewa" to "eSewa", "wallet" to "Wallet").forEach { (id, label) ->
                    FilterChip(
                        selected = paymentMethod == id,
                        onClick = { paymentMethod = id },
                        label = { Text(label) }
                    )
                }
            }

            if (paymentMethod == "wallet") {
                Card {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("Wallet Balance")
                        Text("Rs ${profile.walletBalance}", fontWeight = FontWeight.Bold)
                    }
                }
            } else {
                PaymentQrCard(
                    method = paymentMethod,
                    settings = settings,
                    amountNpr = pkg.priceNpr,
                    reference = "FF-${playerUid.ifBlank { "UID" }}"
                )

                // Dashed Screenshot Upload Card
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.5.dp, MaterialTheme.colorScheme.primary.copy(alpha = 0.5f))
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        if (previewBitmap != null) {
                            Image(
                                bitmap = previewBitmap!!.asImageBitmap(),
                                contentDescription = "Screenshot Preview",
                                contentScale = ContentScale.Crop,
                                modifier = Modifier
                                    .size(96.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .clickable { zoomPreviewOpen = true }
                            )
                            Text("Tap screenshot to zoom", style = MaterialTheme.typography.labelSmall)
                        } else {
                            Text("Upload Payment Screenshot", style = MaterialTheme.typography.bodySmall)
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            Button(
                                onClick = {
                                    pickVisualMediaLauncher.launch(
                                        PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                                    )
                                }
                            ) {
                                Icon(Icons.Default.PhotoLibrary, contentDescription = null)
                                Spacer(Modifier.width(6.dp))
                                Text("Choose Photo")
                            }
                            OutlinedButton(
                                onClick = { openDocumentLauncher.launch(arrayOf("image/*")) }
                            ) {
                                Icon(Icons.Default.FolderOpen, contentDescription = null)
                                Spacer(Modifier.width(6.dp))
                                Text("Files")
                            }
                        }
                    }
                }
            }

            errorMsg?.let {
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }

            Button(
                onClick = {
                    if (playerUid.length < 5) {
                        errorMsg = "Enter a valid numeric Player UID."
                        return@Button
                    }
                    if (paymentMethod != "wallet" && screenshotDataUrl.isBlank()) {
                        errorMsg = "Upload your payment proof screenshot."
                        return@Button
                    }
                    scope.launch {
                        submitting = true
                        errorMsg = null
                        try {
                            val verified = lookupResult?.found == true && lookupResult?.uid == playerUid
                            onSubmitOrder(
                                playerUid,
                                if (verified) lookupResult?.ign.orEmpty() else "",
                                if (verified) lookupResult?.region.orEmpty() else "",
                                verified,
                                paymentMethod,
                                screenshotDataUrl
                            )
                        } catch (e: Exception) {
                            errorMsg = e.message ?: "Failed to submit order"
                        } finally {
                            submitting = false
                        }
                    }
                },
                enabled = !submitting,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp)
            ) {
                Text(if (submitting) "Submitting..." else "Confirm Order · Rs ${pkg.priceNpr}")
            }
            Spacer(Modifier.height(16.dp))
        }
    }

    if (zoomPreviewOpen && previewBitmap != null) {
        FullscreenZoomDialog(
            title = "Payment Screenshot",
            bitmap = previewBitmap!!,
            onDismiss = { zoomPreviewOpen = false }
        )
    }
}
