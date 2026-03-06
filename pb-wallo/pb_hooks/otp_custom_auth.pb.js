// pb_hooks/otp_custom_auth.pb.js

// Almacenamiento temporal en memoria (solo para desarrollo)
const otpStore = new Map();

routerAdd("POST", "/api/otp-generate", (c) => {
    const body = c.requestInfo().body;
    const email = body.email;
    const phone = body.phone || email.replace('@wallo.app', '');
    
    if (!email) {
        return c.json(400, { error: "Email requerido" });
    }
    
    // Generar OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutos
    
    // Guardar en memoria
    otpStore.set(email, { otp, expiresAt, phone });
    
    console.log("======================================");
    console.log("🔑 OTP GENERADO:", otp);
    console.log("📧 Email:", email);
    console.log("📱 Teléfono:", phone);
    console.log("⏰ Expira en 5 minutos");
    console.log("======================================");
    
    return c.json(200, {
        success: true,
        message: "OTP generado - revisa terminal",
        otp: otp // Solo para desarrollo
    });
});

routerAdd("POST", "/api/otp-verify-custom", (c) => {
    const body = c.requestInfo().body;
    const email = body.email;
    const otp = body.otp;
    
    const stored = otpStore.get(email);
    
    if (!stored) {
        return c.json(404, { error: "OTP no encontrado" });
    }
    
    if (Date.now() > stored.expiresAt) {
        otpStore.delete(email);
        return c.json(400, { error: "OTP expirado" });
    }
    
    if (stored.otp !== otp) {
        return c.json(400, { error: "Código incorrecto" });
    }
    
    // OTP válido - buscar usuario y retornar token
    const user = $app.findRecordByFilter("users", `email = "${email}"`);
    if (!user) {
        return c.json(404, { error: "Usuario no encontrado" });
    }
    
    // Limpiar OTP usado
    otpStore.delete(email);
    
    // Generar token de sesión simple (para desarrollo)
    const token = $security.newToken(user.id, "users", "24h");
    
    return c.json(200, {
        success: true,
        message: "Autenticado",
        user_id: user.id,
        token: token,
        user: {
            id: user.id,
            email: user.get("email"),
            phone: user.get("phone"),
            role: user.get("role")
        }
    });
});

console.log("🚀 Hook otp_custom_auth.pb.js cargado");
