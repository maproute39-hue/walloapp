// pb_hooks/otp_auth.js

// Función auxiliar para generar número aleatorio de 6 dígitos
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Función auxiliar para enviar SMS (Aquí debes integrar Twilio, AWS SNS, etc.)
async function sendSMS(phone, code) {
    console.log(`[SMS MOCK] Enviando código ${code} al teléfono ${phone}`);
    // TODO: Integra aquí tu proveedor de SMS real.
    // Ejemplo con fetch a Twilio/AWS:
    // await fetch('https://api.twilio.com/...', { method: 'POST', body: ... })
    return true; 
}

// 1. Endpoint para SOLICITAR el OTP
$app.router().post("/api/request-otp", async (c) => {
    const body = await c.requestJSON();
    const phone = body.phone;

    if (!phone) {
        return c.json(400, { error: "El teléfono es requerido" });
    }

    // Limpiar OTPs anteriores para este teléfono (opcional pero recomendado)
    const dao = $app.dao();
    const collection = $app.findCollectionByNameOrId("otp_requests");
    
    // Buscar registros anteriores y borrarlos para evitar acumulación
    const oldRecords = await dao.findRecordsByFilter(collection.id, `phone = "${phone}"`, "", -1, 0);
    for (const record of oldRecords) {
        await dao.deleteRecord(record);
    }

    // Generar datos
    const code = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 3); // Expira en 3 minutos

    // Guardar en la colección otp_requests
    const record = new $app.models.Record(collection);
    record.set("phone", phone);
    record.set("code", code);
    record.set("expires", expiresAt.toISOString());
    
    await dao.saveRecord(record);

    // Enviar SMS
    await sendSMS(phone, code);

    return c.json(200, { success: true, message: "OTP enviado" });
});

// 2. Endpoint para VERIFICAR el OTP y CREAR USUARIO
$app.router().post("/api/verify-otp", async (c) => {
    const body = await c.requestJSON();
    const phone = body.phone;
    const code = body.code;

    if (!phone || !code) {
        return c.json(400, { error: "Teléfono y código requeridos" });
    }

    const dao = $app.dao();
    const otpCollection = $app.findCollectionByNameOrId("otp_requests");
    const usersCollection = $app.findCollectionByNameOrId("users");

    // Buscar el OTP válido
    // Filtramos por phone y que la fecha de expiración sea mayor a "ahora"
    const now = new Date().toISOString();
    const otpRecord = await dao.findFirstRecordByData(otpCollection, "phone", phone);

    if (!otpRecord) {
        return c.json(401, { error: "Código no encontrado o ya usado" });
    }

    // Verificar expiración
    const expires = new Date(otpRecord.get("expires"));
    if (new Date() > expires) {
        await dao.deleteRecord(otpRecord); // Limpiar código expirado
        return c.json(401, { error: "El código ha expirado" });
    }

    // Verificar coincidencia del código
    if (otpRecord.get("code") !== code) {
        return c.json(401, { error: "Código incorrecto" });
    }

    // --- CÓDIGO VÁLIDO ---

    // 1. Buscar si el usuario ya existe en la colección users
    let userRecord = await dao.findFirstRecordByData(usersCollection, "phone", phone);

    if (!userRecord) {
        // 2. Si no existe, lo creamos
        userRecord = new $app.models.Record(usersCollection);
        // Generamos una contraseña aleatoria interna (requerido por PocketBase Auth)
        // El usuario no la necesita saber, ya que entrará con OTP
        const randomPassword = Math.random().toString(36).slice(-10); 
        
        userRecord.set("phone", phone);
        userRecord.set("password", randomPassword);
        userRecord.set("email", `${phone}@otp.local`); // Email dummy requerido por Auth
        userRecord.set("emailVisibility", false);
        
        // Opcional: Marca de verificación
        userRecord.set("verified", true); 
    } else {
        // Si existe, asegúrate de que esté activo
        // userRecord.set("verified", true); 
    }

    await dao.saveRecord(userRecord);

    // 3. Eliminar el OTP usado para que no se reuse
    await dao.deleteRecord(otpRecord);

    // 4. Generar Token de Autenticación (JWT) para que el cliente inicie sesión automáticamente
    // Esto simula un login exitoso
    const token = $app.newToken(userRecord, "1h"); // Token válido por 1 hora

    return c.json(200, {
        success: true,
        token: token,
        record: userRecord.safeExport() // Devuelve datos del usuario sin password
    });
});
