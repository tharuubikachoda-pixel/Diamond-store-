package com.diamondstore.np.data

import com.diamondstore.np.BuildConfig
import com.diamondstore.np.model.*
import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.ListenerRegistration
import kotlinx.coroutines.tasks.await
import java.util.UUID

class FirestoreRepository {
    val auth: FirebaseAuth = FirebaseAuth.getInstance()
    val db: FirebaseFirestore = FirebaseFirestore.getInstance(
        FirebaseApp.getInstance(),
        BuildConfig.FIRESTORE_DATABASE_ID
    )

    fun isCurrentUserAdmin(): Boolean {
        val user = auth.currentUser ?: return false
        return user.isEmailVerified && user.email.equals(ADMIN_EMAIL, ignoreCase = true)
    }

    suspend fun ensureUserProfile(user: FirebaseUser): UserProfile {
        val ref = db.collection("users").document(user.uid)
        val snap = ref.get().await()
        if (snap.exists()) {
            return snap.toObject(UserProfile::class.java) ?: UserProfile(uid = user.uid, email = user.email.orEmpty())
        }
        val data = hashMapOf(
            "uid" to user.uid,
            "email" to (user.email ?: ""),
            "displayName" to (user.displayName ?: "Player").take(80),
            "phone" to "",
            "defaultUid" to "",
            "recentUids" to emptyList<String>(),
            "walletBalance" to 0L,
            "isBlocked" to false,
            "darkMode" to true,
            "language" to "en",
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp()
        )
        ref.set(data).await()
        return UserProfile(
            uid = user.uid,
            email = user.email.orEmpty(),
            displayName = user.displayName ?: "Player"
        )
    }

    fun observePackages(isAdmin: Boolean, onChange: (List<DiamondPackage>) -> Unit): ListenerRegistration {
        val query = if (isAdmin) {
            db.collection("packages")
        } else {
            db.collection("packages").whereEqualTo("active", true)
        }
        return query.addSnapshotListener { snap, _ ->
            val items = snap?.documents?.mapNotNull { it.toObject(DiamondPackage::class.java) }.orEmpty()
            onChange(if (items.isEmpty()) DefaultCatalog.packages else items.sortedBy { it.sortOrder })
        }
    }

    fun observeStoreSettings(onChange: (StoreSettings) -> Unit): ListenerRegistration {
        return db.collection("store_settings").document("public")
            .addSnapshotListener { snap, _ ->
                onChange(snap?.toObject(StoreSettings::class.java) ?: StoreSettings())
            }
    }

    fun observeUserOrders(uid: String, onChange: (List<TopUpOrder>) -> Unit): ListenerRegistration {
        return db.collection("orders").whereEqualTo("userId", uid)
            .addSnapshotListener { snap, _ ->
                onChange(snap?.documents?.mapNotNull { it.toObject(TopUpOrder::class.java) }.orEmpty())
            }
    }

    suspend fun createOrder(
        profile: UserProfile,
        pkg: DiamondPackage,
        playerUid: String,
        playerIgn: String,
        playerRegion: String,
        ignVerified: Boolean,
        paymentMethod: String,
        screenshotDataUrl: String
    ): String {
        val orderId = "ord_${System.currentTimeMillis()}_${UUID.randomUUID().toString().take(6)}"
        val batch = db.batch()
        val orderRef = db.collection("orders").document(orderId)
        val userRef = db.collection("users").document(profile.uid)

        val orderMap = hashMapOf(
            "id" to orderId,
            "userId" to profile.uid,
            "userEmail" to profile.email,
            "userName" to profile.displayName.take(80),
            "packageId" to pkg.id,
            "packageName" to pkg.name,
            "category" to pkg.category,
            "amountNpr" to pkg.priceNpr,
            "playerUid" to playerUid,
            "playerIgn" to playerIgn,
            "playerRegion" to playerRegion,
            "ignVerified" to ignVerified,
            "paymentMethod" to paymentMethod,
            "screenshotDataUrl" to if (paymentMethod == "wallet") "" else screenshotDataUrl,
            "status" to "pending",
            "adminNote" to "",
            "createdAt" to FieldValue.serverTimestamp(),
            "updatedAt" to FieldValue.serverTimestamp()
        )
        batch.set(orderRef, orderMap)

        val recent = (listOf(playerUid) + profile.recentUids.filter { it != playerUid }).take(5)
        if (paymentMethod == "wallet") {
            require(profile.walletBalance >= pkg.priceNpr) { "Insufficient wallet balance" }
            batch.update(userRef, mapOf(
                "walletBalance" to profile.walletBalance - pkg.priceNpr,
                "recentUids" to recent,
                "defaultUid" to profile.defaultUid.ifBlank { playerUid },
                "updatedAt" to FieldValue.serverTimestamp()
            ))
            val txId = "tx_${System.currentTimeMillis()}_${UUID.randomUUID().toString().take(5)}"
            batch.set(db.collection("wallet_transactions").document(txId), hashMapOf(
                "id" to txId,
                "userId" to profile.uid,
                "type" to "debit",
                "amountNpr" to pkg.priceNpr,
                "description" to "Top-Up: ${pkg.name} (UID $playerUid)",
                "referenceId" to orderId,
                "createdAt" to FieldValue.serverTimestamp()
            ))
        } else {
            batch.update(userRef, mapOf(
                "recentUids" to recent,
                "defaultUid" to profile.defaultUid.ifBlank { playerUid },
                "updatedAt" to FieldValue.serverTimestamp()
            ))
        }
        batch.commit().await()
        return orderId
    }

    suspend fun cancelPendingOrder(orderId: String) {
        db.collection("orders").document(orderId).update(
            mapOf("status" to "cancelled", "updatedAt" to FieldValue.serverTimestamp())
        ).await()
    }

    suspend fun adminSync26Packages() {
        require(isCurrentUserAdmin()) { "Unauthorized" }
        val batch = db.batch()
        for (pkg in DefaultCatalog.packages) {
            batch.set(
                db.collection("packages").document(pkg.id),
                hashMapOf(
                    "id" to pkg.id,
                    "name" to pkg.name,
                    "category" to pkg.category,
                    "priceNpr" to pkg.priceNpr,
                    "diamondAmount" to pkg.diamondAmount,
                    "bonusLabel" to pkg.bonusLabel,
                    "popular" to pkg.popular,
                    "active" to pkg.active,
                    "sortOrder" to pkg.sortOrder,
                    "updatedAt" to FieldValue.serverTimestamp()
                )
            )
        }
        batch.commit().await()
    }

    suspend fun adminUpdateOrderStatus(order: TopUpOrder, status: String, note: String) {
        require(isCurrentUserAdmin()) { "Unauthorized" }
        db.collection("orders").document(order.id).update(
            mapOf(
                "status" to status,
                "adminNote" to note.take(300),
                "updatedAt" to FieldValue.serverTimestamp()
            )
        ).await()
    }

    suspend fun adminSaveStoreSettings(settings: StoreSettings) {
        require(isCurrentUserAdmin()) { "Unauthorized" }
        db.collection("store_settings").document("public").set(
            hashMapOf(
                "esewaId" to settings.esewaId,
                "khaltiId" to settings.khaltiId,
                "whatsappNumber" to settings.whatsappNumber,
                "bankName" to settings.bankName,
                "bankAccountNumber" to settings.bankAccountNumber,
                "bankAccountName" to settings.bankAccountName,
                "supportEmail" to settings.supportEmail,
                "maintenanceMode" to settings.maintenanceMode,
                "maintenanceMessage" to settings.maintenanceMessage,
                "updatedAt" to FieldValue.serverTimestamp()
            )
        ).await()
    }
}
