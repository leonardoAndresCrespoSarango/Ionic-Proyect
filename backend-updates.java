// Agregar estos métodos al UserProfileService existente

/**
 * Actualizar preferencia biométrica del usuario
 */
public void updateBiometricPreference(String uid, boolean enabled) throws ExecutionException, InterruptedException {
    log.info("Updating biometric preference for user: {} to {}", uid, enabled);

    Firestore db = FirestoreClient.getFirestore();
    DocumentSnapshot doc = db.collection("users").document(uid).get().get();

    if (!doc.exists()) {
        throw new RuntimeException("User not found");
    }

    Map<String, Object> updates = new HashMap<>();
    updates.put("biometricEnabled", enabled);
    updates.put("updatedAt", com.google.cloud.Timestamp.now());

    db.collection("users").document(uid).update(updates).get();
    log.info("Biometric preference updated successfully for user: {}", uid);
}

/**
 * Obtener preferencia biométrica del usuario
 */
public boolean getBiometricPreference(String uid) throws ExecutionException, InterruptedException {
    log.debug("Getting biometric preference for user: {}", uid);

    Firestore db = FirestoreClient.getFirestore();
    DocumentSnapshot doc = db.collection("users").document(uid).get().get();

    if (!doc.exists()) {
        throw new RuntimeException("User not found");
    }

    Boolean biometricEnabled = doc.getBoolean("biometricEnabled");
    return biometricEnabled != null ? biometricEnabled : false;
}

/**
 * Obtener estado biométrico de todos los usuarios (para admin)
 */
public List<Map<String, Object>> getAllUsersBiometricStatus() throws ExecutionException, InterruptedException {
    log.debug("Getting biometric status for all users");

    Firestore db = FirestoreClient.getFirestore();
    List<QueryDocumentSnapshot> docs = db.collection("users").get().get().getDocuments();

    List<Map<String, Object>> result = new ArrayList<>();
    for (QueryDocumentSnapshot doc : docs) {
        Map<String, Object> userStatus = new HashMap<>();
        userStatus.put("uid", doc.getString("uid"));
        userStatus.put("email", doc.getString("email"));
        userStatus.put("username", doc.getString("username"));
        userStatus.put("biometricEnabled", doc.getBoolean("biometricEnabled") != null ? doc.getBoolean("biometricEnabled") : false);
        result.add(userStatus);
    }
    return result;
}

// Actualizar los métodos documentToDto y mapToDto para incluir biometricEnabled

private UserProfileDto documentToDto(DocumentSnapshot doc) {
    UserProfileDto dto = new UserProfileDto();
    dto.setUid(doc.getString("uid"));
    dto.setEmail(doc.getString("email"));
    dto.setUsername(doc.getString("username"));
    dto.setName(doc.getString("name"));
    dto.setLastname(doc.getString("lastname"));
    dto.setRole(doc.getString("role"));

    // Agregar campo biométrico
    Boolean biometricEnabled = doc.getBoolean("biometricEnabled");
    dto.setBiometricEnabled(biometricEnabled != null ? biometricEnabled : false);

    return dto;
}

private UserProfileDto mapToDto(Map<String, Object> data) {
    UserProfileDto dto = new UserProfileDto();
    dto.setUid((String) data.get("uid"));
    dto.setEmail((String) data.get("email"));
    dto.setUsername((String) data.get("username"));
    dto.setName((String) data.get("name"));
    dto.setLastname((String) data.get("lastname"));
    dto.setRole((String) data.get("role"));

    // Agregar campo biométrico
    Boolean biometricEnabled = (Boolean) data.get("biometricEnabled");
    dto.setBiometricEnabled(biometricEnabled != null ? biometricEnabled : false);

    return dto;
}

// Actualizar el método register para incluir biometricEnabled por defecto
public UserProfileDto register(RegisterRequest req) throws ExecutionException, InterruptedException {
    log.info("Attempting to register new user with email: {}", req.getEmail());

    Firestore db = FirestoreClient.getFirestore();

    // ... código existente de validación ...

    // Crear nuevo documento con ID autogenerado
    String uid = db.collection("users").document().getId();

    Map<String, Object> userData = new HashMap<>();
    userData.put("uid", uid);
    userData.put("username", req.getUsername());
    userData.put("email", req.getEmail());
    userData.put("password", passwordEncoder.encode(req.getPassword()));
    userData.put("name", req.getName());
    userData.put("lastname", req.getLastname());
    userData.put("role", "CUSTOMER");
    userData.put("disabled", false);
    userData.put("biometricEnabled", false); // Por defecto deshabilitado
    userData.put("createdAt", com.google.cloud.Timestamp.now());
    userData.put("updatedAt", com.google.cloud.Timestamp.now());

    db.collection("users").document(uid).set(userData).get();

    log.info("User registered successfully: {} ({})", req.getEmail(), uid);
    return mapToDto(userData);
}
