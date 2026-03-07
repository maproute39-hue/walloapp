// pb_hooks/otp_debug.pb.js
// Hook para mostrar OTP en consola (SOLO PARA DESARROLLO)

onRecordAfterCreateRequest((e) => {
    // Solo interceptar la colección users
    if (e.collection.name !== 'users') {
        return;
    }
    
    const record = e.record;
    if (!record) return;
    
    // Verificar si es una solicitud de OTP
    // PocketBase no expone el OTP directamente en hooks estándar
    // Pero podemos generar uno manualmente para desarrollo
});

// Endpoint custom para solicitar OTP con log
routerAdd("POST", "/api/request-otp-debug", (c) => {
    try {
        const body = c.requestInfo().body;
        const email = body.email;
        
        if (!email) {
            return c.json(400, { error: "Email es requerido" });
        }
        
        console.log("======================================");
        console.log("📧 Solicitud de OTP para:", email);
        console.log("======================================");
        
        // Buscar el usuario
        const user = $app.findRecordByFilter("users", `email = "${email}"`);
        
        if (!user) {
            return c.json(404, { error: "Usuario no encontrado" });
        }
        
        // Generar OTP manualmente (6 dígitos)
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Calcular expiración (5 minutos)
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 5);
        
        // Guardar OTP en la colección otp_requests (debes crearla)
        // O usar el sistema interno de PocketBase
        
        console.log("======================================");
        console.log("🔑 CÓDIGO OTP GENERADO:", otp);
        console.log("📧 Para email:", email);
        console.log("📱 Para teléfono:", user.get("phone"));
        console.log("⏰ Expira en: 5 minutos");
        console.log("======================================");
        
        // En producción, aquí enviarías el SMS real
        // await sendSMS(user.get("phone"), otp);
        
        // Retornar éxito (en desarrollo, el OTP ya está en logs)
        return c.json(200, {
            success: true,
            message: "OTP generado (revisa los logs)",
            otp: otp, // ⚠️ SOLO PARA DESARROLLO - eliminar en producción
            email: email
        });
        
    } catch (error) {
        console.error("❌ Error en request-otp-debug:", error);
        return c.json(500, { error: error.message });
    }
});

console.log("🚀 Hook otp_debug.pb.js cargado - OTP visible en logs");
