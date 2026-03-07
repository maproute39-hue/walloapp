// otp_create_user.pb.js - Versión corregida

onRecordRequestOTPRequest((e) => {
    // Verificar si el usuario NO existe
    if (!e.record) {
        try {
            const body = e.requestInfo().body;
            const email = body["email"];
            const phone = body["phone"] || "";
            const name = body["name"] || "Usuario automático";
            
            console.log("📝 Creando usuario automático para:", email);
            
            const record = new Record(e.collection);
            record.setEmail(email);
            record.set("phone", phone);
            record.set("name", name);
            record.set("role", "client");
            record.set("verified", false);
            record.setPassword($security.randomString(30));
            
            e.app.save(record);
            e.record = record;
            
            console.log("✅ Usuario creado exitosamente con ID:", record.getId());
            
        } catch (error) {
            console.error("❌ Error al crear usuario:", error.message);
        }
    }
    
    // 🔥 MOSTRAR EL CÓDIGO OTP (ahora sabemos que está en e.password)
    if (e.password) {
        console.log("======================================");
        console.log("🔑 CÓDIGO OTP GENERADO:", e.password);
        console.log("📧 Para email:", e.record?.get("email") || e.requestInfo()?.body?.email || "desconocido");
        console.log("======================================");
    } else {
        console.log("⚠️ No se pudo obtener el código OTP");
    }
    
    return e.next();
}, "users");

console.log("🚀 Hook de creación automática de usuarios cargado correctamente");
