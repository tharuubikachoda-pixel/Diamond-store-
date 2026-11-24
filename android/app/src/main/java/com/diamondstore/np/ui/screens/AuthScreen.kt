package com.diamondstore.np.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountCircle
import androidx.compose.material.icons.filled.Diamond
import androidx.compose.material.icons.filled.ListAlt
import androidx.compose.material.icons.filled.SupportAgent
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.diamondstore.np.model.DefaultCatalog
import com.diamondstore.np.model.DiamondPackage
import com.diamondstore.np.model.StoreSettings

@Composable
fun AuthScreen(
    settings: StoreSettings,
    packages: List<DiamondPackage>,
    isLoading: Boolean,
    errorText: String?,
    onCredentialSignIn: (useAuthorizedOnly: Boolean) -> Unit
) {
    val context = LocalContext.current
    var showPriceList by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Icon(
            imageVector = Icons.Default.Diamond,
            contentDescription = "Diamond Store",
            tint = MaterialTheme.colorScheme.secondary,
            modifier = Modifier.size(64.dp)
        )
        Spacer(Modifier.height(12.dp))
        Text(
            text = "Diamond Store NP",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.ExtraBold
        )
        Spacer(Modifier.height(6.dp))
        Text(
            text = "Official Free Fire Nepal Top-Up Store",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.height(28.dp))

        if (!errorText.isNullOrBlank()) {
            Card(
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = errorText,
                    modifier = Modifier.padding(12.dp),
                    color = MaterialTheme.colorScheme.onErrorContainer,
                    style = MaterialTheme.typography.bodySmall
                )
            }
            Spacer(Modifier.height(12.dp))
        }

        Button(
            onClick = { onCredentialSignIn(true) },
            enabled = !isLoading,
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp)
        ) {
            Icon(Icons.Default.AccountCircle, contentDescription = null)
            Spacer(Modifier.width(8.dp))
            Text(
                if (isLoading) "Signing in..." else "Create / Sign In with Mobile Gmail",
                fontWeight = FontWeight.SemiBold
            )
        }

        Spacer(Modifier.height(10.dp))

        OutlinedButton(
            onClick = { onCredentialSignIn(false) },
            enabled = !isLoading,
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(50.dp)
        ) {
            Text("Use Another Gmail / Add Account")
        }

        Spacer(Modifier.height(18.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            FilledTonalButton(
                onClick = { showPriceList = true },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.ListAlt, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("NP Price List")
            }

            FilledTonalButton(
                onClick = {
                    val digits = settings.whatsappNumber.filter { it.isDigit() }
                    val wa = if (digits.length == 10 && digits.startsWith("9")) "977$digits" else digits
                    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/$wa"))
                    context.startActivity(intent)
                },
                modifier = Modifier.weight(1f),
                shape = RoundedCornerShape(12.dp)
            ) {
                Icon(Icons.Default.SupportAgent, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("WhatsApp")
            }
        }
    }

    if (showPriceList) {
        val list = packages.ifEmpty { DefaultCatalog.packages }
        AlertDialog(
            onDismissRequest = { showPriceList = false },
            title = { Text("Free Fire NP Price List (${list.size})") },
            text = {
                LazyColumn(
                    modifier = Modifier.heightIn(max = 420.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(list) { pkg ->
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(pkg.name, style = MaterialTheme.typography.bodyMedium)
                            Text(
                                "Rs ${pkg.priceNpr}",
                                fontWeight = FontWeight.Bold,
                                color = MaterialTheme.colorScheme.secondary
                            )
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showPriceList = false }) {
                    Text("Close")
                }
            }
        )
    }
}
