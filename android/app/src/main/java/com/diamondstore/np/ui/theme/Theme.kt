package com.diamondstore.np.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

// Dark Mode Tokens
val ObsidianBlack = Color(0xFF040812)
val DeepNavy = Color(0xFF091224)
val SlateBlueCard = Color(0xFF0F1B33)
val SapphireGlow = Color(0xFF00D2FF)
val ElectricBlue = Color(0xFF2186FF)

// Light Mode Tokens
val CleanIce = Color(0xFFF2F6FC)
val CrispWhite = Color(0xFFFFFFFF)
val DeepCobalt = Color(0xFF0B3D91)

private val DarkColors = darkColorScheme(
    primary = ElectricBlue,
    onPrimary = Color.White,
    secondary = SapphireGlow,
    onSecondary = ObsidianBlack,
    background = ObsidianBlack,
    onBackground = Color(0xFFF1F5F9),
    surface = DeepNavy,
    onSurface = Color(0xFFF1F5F9),
    surfaceVariant = SlateBlueCard,
    onSurfaceVariant = Color(0xFFCBD5E1),
    outline = Color(0x26FFFFFF)
)

private val LightColors = lightColorScheme(
    primary = DeepCobalt,
    onPrimary = Color.White,
    secondary = ElectricBlue,
    onSecondary = Color.White,
    background = CleanIce,
    onBackground = Color(0xFF0F172A),
    surface = CrispWhite,
    onSurface = Color(0xFF0F172A),
    surfaceVariant = CrispWhite,
    onSurfaceVariant = Color(0xFF475569),
    outline = Color(0x1F0F172A)
)

@Composable
fun DiamondStoreTheme(
    darkTheme: Boolean,
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        content = content
    )
}
