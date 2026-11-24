package com.diamondstore.np

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import com.diamondstore.np.data.FirestoreRepository
import com.diamondstore.np.model.*
import com.diamondstore.np.ui.screens.*
import com.diamondstore.np.ui.theme.DiamondStoreTheme
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.GoogleAuthProvider
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val repo = FirestoreRepository()
        val credentialManager = CredentialManager.create(this)

        setContent {
            val scope = rememberCoroutineScope()
            var currentUser by remember { mutableStateOf(repo.auth.currentUser) }
            var profile by remember { mutableStateOf<UserProfile?>(null) }
            var packages by remember { mutableStateOf(DefaultCatalog.packages) }
            var settings by remember { mutableStateOf(StoreSettings()) }
            var orders by remember { mutableStateOf<List<TopUpOrder>>(emptyList()) }
            var darkMode by remember { mutableStateOf(true) }
            var language by remember { mutableStateOf("en") }
            var activeTab by remember { mutableIntStateOf(0) }
            var showAdmin by remember { mutableStateOf(false) }
            var checkoutPkg by remember { mutableStateOf<DiamondPackage?>(null) }
            var selectedCategory by remember { mutableStateOf("all") }
            var authLoading by remember { mutableStateOf(false) }
            var authError by remember { mutableStateOf<String?>(null) }

            val isAdmin = repo.isCurrentUserAdmin()

            DisposableEffect(currentUser?.uid) {
                val pkgReg = repo.observePackages(isAdmin) { packages = it }
                val setReg = repo.observeStoreSettings { settings = it }
                val ordReg = currentUser?.uid?.let { uid ->
                    repo.observeUserOrders(uid) { orders = it }
                }
                onDispose {
                    pkgReg.remove()
                    setReg.remove()
                    ordReg?.remove()
                }
            }

            LaunchedEffect(currentUser?.uid) {
                val u = currentUser
                if (u != null) {
                    val p = repo.ensureUserProfile(u)
                    profile = p
                    darkMode = p.darkMode
                    language = p.language
                } else {
                    profile = null
                }
            }

            fun triggerGoogleSignIn(filterByAuthorizedAccounts: Boolean) {
                scope.launch {
                    authLoading = true
                    authError = null
                    try {
                        val googleIdOption = GetGoogleIdOption.Builder()
                            .setFilterByAuthorizedAccounts(filterByAuthorizedAccounts)
                            .setServerClientId(BuildConfig.GOOGLE_WEB_CLIENT_ID)
                            .setAutoSelectEnabled(false)
                            .build()
                        val request = GetCredentialRequest.Builder()
                            .addCredentialOption(googleIdOption)
                            .build()
                        val result = credentialManager.getCredential(this@MainActivity, request)
                        val cred = result.credential
                        if (cred is CustomCredential && cred.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                            val tokenCred = GoogleIdTokenCredential.createFrom(cred.data)
                            val firebaseCred = GoogleAuthProvider.getCredential(tokenCred.idToken, null)
                            repo.auth.signInWithCredential(firebaseCred).await()
                            currentUser = repo.auth.currentUser
                        }
                    } catch (e: Exception) {
                        authError = e.localizedMessage ?: "Google Sign-In cancelled or failed."
                    } finally {
                        authLoading = false
                    }
                }
            }

            DiamondStoreTheme(darkTheme = darkMode) {
                if (currentUser == null || profile == null) {
                    Surface(color = MaterialTheme.colorScheme.background) {
                        AuthScreen(
                            settings = settings,
                            packages = packages,
                            isLoading = authLoading,
                            errorText = authError,
                            onCredentialSignIn = ::triggerGoogleSignIn
                        )
                    }
                } else if (showAdmin && isAdmin) {
                    Surface(color = MaterialTheme.colorScheme.background) {
                        AdminPanelScreen(
                            settings = settings,
                            onSync26Packages = { scope.launch { repo.adminSync26Packages() } },
                            onSaveSettings = { updated -> scope.launch { repo.adminSaveStoreSettings(updated) } },
                            onBack = { showAdmin = false }
                        )
                    }
                } else {
                    Scaffold(
                        bottomBar = {
                            NavigationBar {
                                NavigationBarItem(
                                    selected = activeTab == 0,
                                    onClick = { activeTab = 0 },
                                    icon = { Icon(Icons.Default.Home, contentDescription = "Home") },
                                    label = { Text("Home") }
                                )
                                NavigationBarItem(
                                    selected = activeTab == 1,
                                    onClick = { activeTab = 1 },
                                    icon = { Icon(Icons.Default.Receipt, contentDescription = "Orders") },
                                    label = { Text("Orders") }
                                )
                                NavigationBarItem(
                                    selected = activeTab == 2,
                                    onClick = { activeTab = 2 },
                                    icon = { Icon(Icons.Default.Person, contentDescription = "Account") },
                                    label = { Text("Account") }
                                )
                            }
                        }
                    ) { innerPadding ->
                        Box(modifier = Modifier.padding(innerPadding)) {
                            when (activeTab) {
                                0 -> HomeTab(
                                    packages = packages,
                                    selectedCategory = selectedCategory,
                                    onSelectCategory = { selectedCategory = it },
                                    onSelectPackage = { checkoutPkg = it }
                                )
                                1 -> OrdersTab(
                                    orders = orders,
                                    onCancelOrder = { id -> scope.launch { repo.cancelPendingOrder(id) } }
                                )
                                else -> AccountTab(
                                    profile = profile!!,
                                    isAdmin = isAdmin,
                                    darkMode = darkMode,
                                    language = language,
                                    onToggleDarkMode = { darkMode = !darkMode },
                                    onToggleLanguage = { language = if (language == "en") "ne" else "en" },
                                    onOpenAdmin = { showAdmin = true },
                                    onSignOut = {
                                        repo.auth.signOut()
                                        currentUser = null
                                    }
                                )
                            }
                        }
                    }

                    checkoutPkg?.let { pkg ->
                        CheckoutSheet(
                            pkg = pkg,
                            profile = profile!!,
                            settings = settings,
                            onDismiss = { checkoutPkg = null },
                            onSubmitOrder = { uid, ign, region, verified, method, screenshot ->
                                repo.createOrder(profile!!, pkg, uid, ign, region, verified, method, screenshot)
                                checkoutPkg = null
                                activeTab = 1
                            }
                        )
                    }
                }
            }
        }
    }
}
