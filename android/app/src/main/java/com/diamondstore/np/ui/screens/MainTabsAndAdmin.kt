package com.diamondstore.np.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.diamondstore.np.model.*

import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.input.KeyboardType
import com.diamondstore.np.data.FreeFireLookupService
import kotlinx.coroutines.launch

@Composable
fun HomeTab(
    packages: List<DiamondPackage>,
    selectedCategory: String,
    onSelectCategory: (String) -> Unit,
    onSelectPackage: (DiamondPackage) -> Unit
) {
    val scope = rememberCoroutineScope()
    var uidInput by remember { mutableStateOf("") }
    var lookupLoading by remember { mutableStateOf(false) }
    var lookupResult by remember { mutableStateOf<UidLookupResult?>(null) }

    val categories = listOf(
        "all" to "All",
        "diamonds" to "Diamonds",
        "weekly" to "Weekly",
        "monthly" to "Monthly",
        "levelup" to "Level Up"
    )
    val filtered = remember(packages, selectedCategory) {
        packages.filter { it.active && (selectedCategory == "all" || it.category == selectedCategory) }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Text(
                        text = "Free Fire Nepal Top-Up",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.ExtraBold
                    )
                    Text(
                        text = "26 Official NP Packages · Instant UID Verification · eSewa & Wallet",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }

        item {
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        text = "Free Fire UID Verify",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = uidInput,
                            onValueChange = { raw ->
                                val clean = raw.filter { it.isDigit() }.take(20)
                                uidInput = clean
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
                                    lookupResult = FreeFireLookupService.lookupUid(uidInput)
                                    lookupLoading = false
                                }
                            },
                            enabled = !lookupLoading && uidInput.length >= 5,
                            modifier = Modifier.height(54.dp)
                        ) {
                            Text(if (lookupLoading) "..." else "Verify")
                        }
                    }

                    lookupResult?.let { res ->
                        if (res.found) {
                            Card(colors = CardDefaults.cardColors(containerColor = Color(0x2210B981))) {
                                Column(modifier = Modifier.fillMaxWidth().padding(12.dp)) {
                                    Text(
                                        text = "Player Name: ${res.ign}",
                                        fontWeight = FontWeight.Bold,
                                        color = Color(0xFF10B981)
                                    )
                                    Text(
                                        text = "UID ${res.uid} · Server: ${res.region}",
                                        style = MaterialTheme.typography.bodySmall
                                    )
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
                }
            }
        }

        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(categories) { (id, label) ->
                    FilterChip(
                        selected = selectedCategory == id,
                        onClick = { onSelectCategory(id) },
                        label = { Text(label) }
                    )
                }
            }
        }

        items(filtered, key = { it.id }) { pkg ->
            Card(
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.primary.copy(alpha = 0.14f),
                        modifier = Modifier.size(44.dp)
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                Icons.Default.Diamond,
                                contentDescription = pkg.name,
                                tint = MaterialTheme.colorScheme.secondary
                            )
                        }
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(pkg.name, fontWeight = FontWeight.Bold)
                        Text(
                            "${pkg.category.uppercase()} · ${pkg.bonusLabel}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Button(onClick = { onSelectPackage(pkg) }) {
                        Text("Rs ${pkg.priceNpr}")
                    }
                }
            }
        }
    }
}

@Composable
fun OrdersTab(
    orders: List<TopUpOrder>,
    onCancelOrder: (String) -> Unit
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        items(orders, key = { it.id }) { order ->
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(order.packageName, fontWeight = FontWeight.Bold)
                        Text("Rs ${order.amountNpr}", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.secondary)
                    }
                    Text("UID: ${order.playerUid} · Status: ${order.status.uppercase()}", style = MaterialTheme.typography.bodySmall)
                    if (order.status == "pending") {
                        TextButton(onClick = { onCancelOrder(order.id) }) {
                            Text("Cancel Pending Order", color = MaterialTheme.colorScheme.error)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun AccountTab(
    profile: UserProfile,
    isAdmin: Boolean,
    darkMode: Boolean,
    language: String,
    onToggleDarkMode: () -> Unit,
    onToggleLanguage: () -> Unit,
    onOpenAdmin: () -> Unit,
    onSignOut: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Card(shape = RoundedCornerShape(18.dp)) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(profile.displayName, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                Text(profile.email, style = MaterialTheme.typography.bodySmall)
                Text("Wallet Balance: Rs ${profile.walletBalance}", fontWeight = FontWeight.SemiBold)
            }
        }

        Card(shape = RoundedCornerShape(18.dp)) {
            Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Dark Mode")
                    Switch(checked = darkMode, onCheckedChange = { onToggleDarkMode() })
                }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Language ($language)")
                    OutlinedButton(onClick = onToggleLanguage) {
                        Text(if (language == "en") "Switch to NE" else "Switch to EN")
                    }
                }
            }
        }

        // Admin Control Panel button visible strictly only to rc0470638@gmail.com
        if (isAdmin) {
            Button(
                onClick = onOpenAdmin,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp)
            ) {
                Icon(Icons.Default.AdminPanelSettings, contentDescription = null)
                Spacer(Modifier.width(8.dp))
                Text("Open Admin Control Panel")
            }
        }

        OutlinedButton(onClick = onSignOut, modifier = Modifier.fillMaxWidth()) {
            Text("Sign Out")
        }
    }
}

@Composable
fun AdminPanelScreen(
    settings: StoreSettings,
    onSync26Packages: () -> Unit,
    onSaveSettings: (StoreSettings) -> Unit,
    onBack: () -> Unit
) {
    var esewa by remember(settings) { mutableStateOf(settings.esewaId) }
    var whatsapp by remember(settings) { mutableStateOf(settings.whatsappNumber) }
    var maintenance by remember(settings) { mutableStateOf(settings.maintenanceMode) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = onBack) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Back")
            }
            Text("Admin Control Panel ($ADMIN_EMAIL)", fontWeight = FontWeight.Bold)
        }

        Button(onClick = onSync26Packages, modifier = Modifier.fillMaxWidth()) {
            Text("Sync 26 Default NP Packages to Firestore")
        }

        OutlinedTextField(value = esewa, onValueChange = { esewa = it }, label = { Text("eSewa ID") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(value = whatsapp, onValueChange = { whatsapp = it }, label = { Text("WhatsApp Support") }, modifier = Modifier.fillMaxWidth())

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text("Maintenance Mode")
            Switch(checked = maintenance, onCheckedChange = { maintenance = it })
        }

        Button(
            onClick = {
                onSaveSettings(
                    settings.copy(
                        esewaId = esewa,
                        whatsappNumber = whatsapp,
                        maintenanceMode = maintenance
                    )
                )
            },
            modifier = Modifier.fillMaxWidth()
        ) {
            Text("Save Store Settings")
        }
    }
}
