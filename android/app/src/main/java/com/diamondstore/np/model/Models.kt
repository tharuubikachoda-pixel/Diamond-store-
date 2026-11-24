package com.diamondstore.np.model

const val ADMIN_EMAIL = "rc0470638@gmail.com"

data class StoreSettings(
    val esewaId: String = "9708086962",
    val khaltiId: String = "9708086962",
    val whatsappNumber: String = "9708086962",
    val bankName: String = "NIC Asia Bank",
    val bankAccountNumber: String = "0123456789012345",
    val bankAccountName: String = "Diamond Store NP",
    val supportEmail: String = "rc0470638@gmail.com",
    val maintenanceMode: Boolean = false,
    val maintenanceMessage: String = "Scheduled maintenance is underway."
)

data class DiamondPackage(
    val id: String = "",
    val name: String = "",
    val category: String = "diamonds", // diamonds | weekly | monthly | levelup
    val priceNpr: Int = 0,
    val diamondAmount: Int = 0,
    val bonusLabel: String = "",
    val popular: Boolean = false,
    val active: Boolean = true,
    val sortOrder: Int = 0,
    val imageUrl: String = ""
)

data class UserProfile(
    val uid: String = "",
    val email: String = "",
    val displayName: String = "",
    val phone: String = "",
    val defaultUid: String = "",
    val recentUids: List<String> = emptyList(),
    val walletBalance: Long = 0L,
    val isBlocked: Boolean = false,
    val darkMode: Boolean = true,
    val language: String = "en"
)

data class TopUpOrder(
    val id: String = "",
    val userId: String = "",
    val userEmail: String = "",
    val userName: String = "",
    val packageId: String = "",
    val packageName: String = "",
    val category: String = "diamonds",
    val amountNpr: Int = 0,
    val playerUid: String = "",
    val playerIgn: String = "",
    val playerRegion: String = "",
    val ignVerified: Boolean = false,
    val paymentMethod: String = "esewa",
    val screenshotDataUrl: String = "",
    val status: String = "pending",
    val adminNote: String = ""
)

data class WalletTopUp(
    val id: String = "",
    val userId: String = "",
    val userEmail: String = "",
    val userName: String = "",
    val amountNpr: Int = 0,
    val paymentMethod: String = "esewa",
    val screenshotDataUrl: String = "",
    val status: String = "pending",
    val adminNote: String = ""
)

data class WalletTransaction(
    val id: String = "",
    val userId: String = "",
    val type: String = "credit",
    val amountNpr: Int = 0,
    val description: String = "",
    val referenceId: String = ""
)

data class SupportTicket(
    val id: String = "",
    val userId: String = "",
    val userEmail: String = "",
    val userName: String = "",
    val subject: String = "",
    val category: String = "order",
    val status: String = "open",
    val lastMessage: String = ""
)

data class SupportMessage(
    val id: String = "",
    val ticketOwnerId: String = "",
    val senderId: String = "",
    val senderEmail: String = "",
    val senderRole: String = "user",
    val text: String = "",
    val attachmentDataUrl: String = ""
)

data class Announcement(
    val id: String = "",
    val title: String = "",
    val message: String = "",
    val badge: String = "Offer",
    val active: Boolean = true
)

data class ActivityLog(
    val id: String = "",
    val adminEmail: String = "",
    val action: String = "",
    val targetType: String = "",
    val targetId: String = "",
    val details: String = ""
)

data class UidLookupResult(
    val found: Boolean,
    val busy: Boolean,
    val uid: String,
    val ign: String,
    val region: String,
    val message: String
)

object DefaultCatalog {
    val packages: List<DiamondPackage> = listOf(
        // Diamonds (10)
        DiamondPackage("ff_np_25", "25 Diamonds", "diamonds", 30, 25, "Instant UID", false, true, 1),
        DiamondPackage("ff_np_50", "50 Diamonds", "diamonds", 50, 50, "Instant UID", false, true, 2),
        DiamondPackage("ff_np_115", "115 Diamonds", "diamonds", 110, 115, "Best Starter", true, true, 3),
        DiamondPackage("ff_np_240", "240 Diamonds", "diamonds", 210, 240, "Value Pick", true, true, 4),
        DiamondPackage("ff_np_355", "355 Diamonds", "diamonds", 350, 355, "Instant UID", false, true, 5),
        DiamondPackage("ff_np_480", "480 Diamonds", "diamonds", 450, 480, "Instant UID", false, true, 6),
        DiamondPackage("ff_np_610", "610 Diamonds", "diamonds", 520, 610, "Top Seller", true, true, 7),
        DiamondPackage("ff_np_850", "850 Diamonds", "diamonds", 760, 850, "Squad Bundle", false, true, 8),
        DiamondPackage("ff_np_1240", "1240 Diamonds", "diamonds", 1230, 1240, "Pro Pack", false, true, 9),
        DiamondPackage("ff_np_2530", "2530 Diamonds", "diamonds", 2200, 2530, "Max Value", true, true, 10),

        // Weekly Memberships (8)
        DiamondPackage("ff_np_weekly_lite", "Weekly Lite", "weekly", 75, 100, "7-Day Lite Pass", false, true, 11),
        DiamondPackage("ff_np_2x_weekly_lite", "2x Weekly Lite", "weekly", 150, 200, "2x Lite Stack", false, true, 12),
        DiamondPackage("ff_np_3x_weekly_lite", "3x Weekly Lite", "weekly", 230, 300, "3x Lite Stack", false, true, 13),
        DiamondPackage("ff_np_5x_weekly_lite", "5x Weekly Lite", "weekly", 370, 500, "5x Lite Stack", false, true, 14),
        DiamondPackage("ff_np_weekly", "Weekly", "weekly", 225, 450, "VIP Daily Claim", true, true, 15),
        DiamondPackage("ff_np_2x_weekly", "2x Weekly", "weekly", 460, 900, "14-Day Stack", false, true, 16),
        DiamondPackage("ff_np_3x_weekly", "3x Weekly", "weekly", 660, 1350, "21-Day Stack", false, true, 17),
        DiamondPackage("ff_np_4x_weekly", "4x Weekly", "weekly", 880, 1800, "28-Day Stack", false, true, 18),

        // Monthly Memberships (2)
        DiamondPackage("ff_np_monthly", "Monthly", "monthly", 1070, 2600, "30-Day VIP Pass", true, true, 19),
        DiamondPackage("ff_np_2x_monthly", "2x Monthly", "monthly", 2130, 5200, "60-Day VIP Stack", false, true, 20),

        // Level Up Pass (6)
        DiamondPackage("ff_np_lvl_6", "Lvl 6 Pass", "levelup", 85, 120, "Level 6 Milestone", false, true, 21),
        DiamondPackage("ff_np_lvl_10", "Lvl 10 Pass", "levelup", 120, 200, "Level 10 Milestone", false, true, 22),
        DiamondPackage("ff_np_lvl_15", "Lvl 15 Pass", "levelup", 120, 200, "Level 15 Milestone", false, true, 23),
        DiamondPackage("ff_np_lvl_20", "Lvl 20 Pass", "levelup", 120, 200, "Level 20 Milestone", false, true, 24),
        DiamondPackage("ff_np_lvl_25", "Lvl 25 Pass", "levelup", 120, 200, "Level 25 Milestone", false, true, 25),
        DiamondPackage("ff_np_lvl_30", "Lvl 30 Pass", "levelup", 200, 350, "Level 30 Finale", true, true, 26)
    )
}
