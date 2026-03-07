// pb_hooks/phone_otp_auth.pb.js

// ✅ Funciones con declaración tradicional (Goja-compatible)
function generateOTP() {
    return $security.randomString(6, '0123456789');
}

function isValidPhone(phone) {
    const cleaned = (phone || '').replace(/[\s\-\(\)]/g, '');
    return /^\+?[1-9]\d{8,14}$/.test(cleaned);
}

// ✅ Endpoint: Solicitar OTP
routerAdd("POST", "/api/request-phone-otp", (c) => {
    try {
        const body = c.requestInfo().body;
        const rawPhone = body.phone || '';
        const phone = rawPhone.replace(/[\s\-\(\)]/g, '');

        console.log("Request phone:", phone);

        // ✅ Validación inline + función (doble garantía para Goja)
        const cleaned = (phone || '').replace(/[\s\-\(\)]/g, '');
        if (!/^\+?[1-9]\d{8,14}$/.test(cleaned) && !isValidPhone(phone)) {
            return c.json(400, { error: "Formato de teléfono inválido" });
        }

        const dao = $app.dao();
        const otpCollection = $app.findCollectionByNameOrId("otp_requests");
        
        const code = generateOTP();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        const record = new $app.models.Record(otpCollection);
        record.set("phone", phone);
        record.set("code", code);
        record.set("expires", expiresAt.toISOString());
        dao.saveRecord(record);

        console.log(`[SMS DEV] OTP para ${phone}: ${code}`);
        console.log(`[SMS] OTP enviado a ***${phone.slice(-4)}`);

        return c.json(200, { success: true, message: "Código enviado" });
    } catch (error) {
        console.error("Error in request-phone-otp:", error.message || error);
        return c.json(500, { error: "Internal server error" });
    }
});

// ✅ Endpoint: Verificar OTP
routerAdd("POST", "/api/verify-phone-otp", (c) => {
    const { phone, code } = c.requestInfo().body;
    
    if (!phone || !code) {
        return c.json(400, { error: "Teléfono y código requeridos" });
    }

    const dao = $app.dao();
    const otpCollection = $app.findCollectionByNameOrId("otp_requests");
    const usersCollection = $app.findCollectionByNameOrId("users");

    const otpRecord = dao.findFirstRecordByFilter(
        otpCollection,
        "phone = {:phone} && expires > {:now}",
        { phone, now: new Date().toISOString() },
        "-created"
    );

    const invalidResponse = () => c.json(401, { error: "Código inválido o expirado" });
    
    if (!otpRecord) return invalidResponse();
    if (otpRecord.get("code") !== code) return invalidResponse();

    let userRecord = dao.findFirstRecordByData(usersCollection, "phone", phone);
    
    dao.runInTransaction((txDao) => {
        if (!userRecord) {
            userRecord = new $app.models.Record(usersCollection);
            const randomPassword = $security.randomString(32);
            const email = `phone_${phone.replace(/[^0-9]/g, '').slice(-10)}@phone.local`;
            
            userRecord.set("email", email);
            userRecord.set("password", randomPassword);
            userRecord.set("passwordConfirm", randomPassword);
            userRecord.set("phone", phone);
            userRecord.set("verified", true);
            userRecord.set("emailVisibility", false);
            txDao.saveRecord(userRecord);
        } else {
            userRecord.set("verified", true);
            txDao.saveRecord(userRecord);
        }
        txDao.deleteRecord(otpRecord);
    });

    const token = $security.newToken(userRecord.id, "users", "1h");

    return c.json(200, {
        success: true,
        token,
        record: userRecord.safeExport()
    });
});

// ✅ Cron: Limpieza
cronAdd("cleanup-expired-otp", "0 * * * *", () => {
    const dao = $app.dao();
    const otpCollection = $app.findCollectionByNameOrId("otp_requests");
    dao.deleteRecordsByFilter(otpCollection, "expires <= {:now}", { 
        now: new Date().toISOString() 
    });
    console.log("[Cleanup] OTPs expirados eliminados");
});

console.log("🚀 Hook phone_otp_auth.pb.js cargado con funciones Goja-compatible");