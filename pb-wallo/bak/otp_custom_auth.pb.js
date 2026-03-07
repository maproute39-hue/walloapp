// pb_hooks/otp_custom_auth.pb.js
// Versión simplificada: sin otpStore, solo DB

routerAdd("POST", "/api/otp-generate", (c) => {
    try {
        const body = c.requestInfo().body;
        const { usuario_id, telefono, email } = body;
        
        // BUSCAR USUARIO
        let user = null;
        if (usuario_id) {
            user = $app.findRecordById("users", usuario_id);
        } else if (telefono) {
            const users = $app.findRecordsByFilter("users", "phone = {:phone}", "", 1, 0, { phone: telefono });
            if (users.length === 0) return c.json(404, { error: "Usuario no encontrado" });
            user = users[0];
        } else if (email) {
            user = $app.findFirstRecordByData("users", "email", email);
        }
        
        if (!user) return c.json(404, { error: "Usuario no encontrado" });
        
        // GENERAR OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min
        
        // GUARDAR EN CAMPOS DEL USUARIO (DB)
        user.set("otp_code", otp);
        user.set("otp_expires", expiresAt);
        user.set("otp_attempts", 0);
        $app.save(user);
        
        console.log(`🔐 OTP para ${user.get("phone")}: ${otp} | Exp: ${expiresAt}`);
        
        return c.json(200, {
            success: true,
            message: "Código enviado. Válido por 5 minutos.",
            usuario_id: user.id,
            expires_in: 300
            // otp: otp  // ⚠️ NO retornar en producción
        });
        
    } catch (err) {
        console.error("❌ Error generando OTP:", err);
        return c.json(500, { error: err.message });
    }
});

routerAdd("POST", "/api/otp-verify-custom", (c) => {
    try {
        const body = c.requestInfo().body;
        const { usuario_id, otp } = body;
        
        if (!usuario_id || !otp) {
            return c.json(400, { error: "usuario_id y otp son requeridos" });
        }
        
        const user = $app.findRecordById("users", usuario_id);
        
        const storedOtp = user.get("otp_code");
        const expiresAt = user.get("otp_expires");
        const attempts = user.get("otp_attempts") || 0;
        
        if (!storedOtp || !expiresAt) {
            return c.json(400, { error: "No hay código activo. Solicita uno nuevo." });
        }
        
        if (new Date() > new Date(expiresAt)) {
            user.set("otp_code", null);
            user.set("otp_expires", null);
            $app.save(user);
            return c.json(400, { error: "Código expirado" });
        }
        
        if (attempts >= 3) {
            user.set("otp_code", null);
            user.set("otp_expires", null);
            user.set("otp_attempts", 0);
            $app.save(user);
            return c.json(400, { error: "Demasiados intentos. Solicita un nuevo código." });
        }
        
        if (storedOtp !== otp) {
            user.set("otp_attempts", attempts + 1);
            $app.save(user);
            return c.json(400, { error: `Código incorrecto. Intentos restantes: ${3 - (attempts + 1)}` });
        }
        
        // ✅ OTP VÁLIDO: limpiar y autenticar
        user.set("otp_code", null);
        user.set("otp_expires", null);
        user.set("otp_attempts", 0);
        user.set("verified", true);
        $app.save(user);
        
        // const token = $security.newToken(user.id, "users", "24h");
        // const token = $app.newAuthToken(user, "24h");
        return c.json(200, {
            success: true,
            message: "Autenticado correctamente",
            // token: token,
            user: {
                id: user.id,
                email: user.get("email"),
                phone: user.get("phone"),
                role: user.get("role"),
                verified: user.get("verified")
            }
        });
        
    } catch (err) {
        console.error("❌ Error verificando OTP:", err);
        return c.json(500, { error: err.message });
    }
});

console.log("🚀 Hook otp_custom_auth.pb.js cargado");