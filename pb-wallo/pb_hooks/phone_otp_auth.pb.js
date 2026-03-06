// pb_hooks/phone_otp_auth.pb.js
// Hook para autenticación OTP basada en teléfono

// Función auxiliar para generar número aleatorio de 6 dígitos
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Función auxiliar para enviar SMS (mock - integrar con Twilio, AWS SNS, etc.)
async function sendSMS(phone, code) {
    console.log(`[SMS MOCK] Enviando código ${code} al teléfono ${phone}`);
    // TODO: Integra tu proveedor de SMS real aquí
    // Ejemplo: await twilio.messages.create({ body: `Tu código: ${code}`, from: '+1234567890', to: phone });
    return true;
}

// 1. Endpoint para SOLICITAR OTP para un teléfono
routerAdd("POST", "/api/request-phone-otp", (c) => {
    const body = c.requestInfo().body;
    const phone = body.phone;

    if (!phone) {
        return c.json(400, { error: "El teléfono es requerido" });
    }

    const dao = $app.dao();
    const otpCollection = $app.findCollectionByNameOrId("otp_requests");

    // Limpiar OTPs anteriores para este teléfono
    const oldRecords = dao.findRecordsByFilter(otpCollection.id, `phone = "${phone}"`, "", -1, 0);
    for (const record of oldRecords) {
        dao.deleteRecord(record);
    }

    // Generar OTP
    const code = generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5); // Expira en 5 minutos

    // Guardar en otp_requests
    const record = new $app.models.Record(otpCollection);
    record.set("phone", phone);
    record.set("code", code);
    record.set("expires", expiresAt.toISOString());

    dao.saveRecord(record);

    // Enviar SMS
    sendSMS(phone, code);

    return c.json(200, { success: true, message: "OTP enviado al teléfono" });
});

// 2. Endpoint para VERIFICAR OTP y CREAR/VERIFICAR USUARIO
routerAdd("POST", "/api/verify-phone-otp", (c) => {
    const body = c.requestInfo().body;
    const phone = body.phone;
    const code = body.code;

    if (!phone || !code) {
        return c.json(400, { error: "Teléfono y código requeridos" });
    }

    const dao = $app.dao();
    const otpCollection = $app.findCollectionByNameOrId("otp_requests");
    const usersCollection = $app.findCollectionByNameOrId("users");

    // Buscar OTP válido
    const otpRecord = dao.findFirstRecordByData(otpCollection, "phone", phone);

    if (!otpRecord) {
        return c.json(401, { error: "Código no encontrado o ya usado" });
    }

    // Verificar expiración
    const expires = new Date(otpRecord.get("expires"));
    if (new Date() > expires) {
        dao.deleteRecord(otpRecord); // Limpiar código expirado
        return c.json(401, { error: "El código ha expirado" });
    }

    // Verificar código
    if (otpRecord.get("code") !== code) {
        return c.json(401, { error: "Código incorrecto" });
    }

    // OTP válido - buscar o crear usuario
    let userRecord = dao.findFirstRecordByData(usersCollection, "phone", phone);

    if (!userRecord) {
        // Crear nuevo usuario
        userRecord = new $app.models.Record(usersCollection);
        const randomPassword = $security.randomString(32);
        const email = `${phone.replace(/[^0-9]/g, '')}@phone.local`; // Email dummy

        userRecord.set("email", email);
        userRecord.set("password", randomPassword);
        userRecord.set("passwordConfirm", randomPassword);
        userRecord.set("phone", phone);
        userRecord.set("verified", true); // Verificado tras OTP exitoso
        userRecord.set("emailVisibility", false);

        dao.saveRecord(userRecord);
    } else {
        // Si existe, verificar cuenta
        userRecord.set("verified", true);
        dao.saveRecord(userRecord);
    }

    // Eliminar OTP usado
    dao.deleteRecord(otpRecord);

    // Generar token de autenticación
    const token = $security.newToken(userRecord.id, "users", "1h");

    return c.json(200, {
        success: true,
        token: token,
        record: userRecord.safeExport()
    });
});

console.log("🚀 Hook phone_otp_auth.pb.js cargado");
