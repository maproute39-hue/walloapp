// pb_hooks/registro_telefono.pb.js
// Endpoint para registro solo con teléfono

routerAdd("POST", "/api/registro-telefono", (c) => {
    try {
        const data = c.requestInfo().body;
        const telefono = data.telefono;
        
        if (!telefono) {
            return c.json(400, { error: "El teléfono es requerido" });
        }
        
        console.log("📱 Registro solicitado para:", telefono);
        
        // Normalizar teléfono (solo dígitos)
        const phoneDigits = telefono.replace(/[^0-9]/g, '');
        
        // Generar email único basado en teléfono
        const email = `${phoneDigits}@wallo.app`;
        
        // BUSCAR USUARIO EXISTENTE
        let usuarioExistente = null;
        try {
            const records = $app.findRecordsByFilter(
                "users", 
                "phone = {:phone}", 
                "", 
                1, 
                0, 
                { phone: telefono }
            );
            if (records.length > 0) {
                usuarioExistente = records[0];
                console.log("📱 Usuario existente encontrado");
            }
        } catch (e) {
            console.log("📱 No existe, creando nuevo...");
        }
        
        if (usuarioExistente) {
            // Usuario ya existe - el cliente debe solicitar OTP
            return c.json(200, {
                success: true,
                message: "Usuario ya existe. Solicite código OTP.",
                telefono: telefono,
                usuario_id: usuarioExistente.id,
                email: usuarioExistente.get("email")
            });
        }
        
        // CREAR NUEVO USUARIO
        const collection = $app.findCollectionByNameOrId("users");
        const usuario = new Record(collection);
        
        usuario.set("email", email);
        usuario.set("phone", telefono);
        usuario.set("name", "Usuario " + phoneDigits.slice(-4));
        usuario.set("role", "client");
        usuario.set("verified", false);
        usuario.setPassword($security.randomString(30));
        
        $app.save(usuario);
        console.log("✅ Usuario creado exitosamente con ID:", usuario.id);
        
        return c.json(200, {
            success: true,
            message: "Usuario creado. Solicite código OTP.",
            telefono: telefono,
            usuario_id: usuario.id,
            email: email
        });
        
    } catch (error) {
        console.error("❌ Error en registro:", error);
        return c.json(500, { error: error.message });
    }
});

console.log("🚀 Endpoint /api/registro-telefono cargado");
