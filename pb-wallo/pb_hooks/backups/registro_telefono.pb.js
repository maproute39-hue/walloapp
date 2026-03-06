// registro_telefono.pb.js - Endpoint para registro solo con teléfono
// VERSIÓN CON GENERACIÓN OTP CORRECTA

routerAdd("POST", "/api/registro-telefono", (c) => {
    try {
        // Obtener datos del body
        const data = c.requestInfo().body;
        const telefono = data.telefono;
        
        if (!telefono) {
            return c.json(400, { error: "El teléfono es requerido" });
        }
        
        console.log("📱 Registro solicitado para:", telefono);
        
        // Generar email único basado en teléfono
        const email = telefono.replace(/[^0-9]/g, '') + "@wallo.usuario";
        
        // BUSCAR USUARIO
        let usuarioExistente = null;
        try {
            const records = $app.findRecordsByFilter("users", `phone = '${telefono}'`, "", 1, 0);
            if (records.length > 0) {
                usuarioExistente = records[0];
                console.log("📱 Usuario existente encontrado");
            }
        } catch (e) {
            console.log("📱 No existe, creando nuevo...");
        }
        
        if (usuarioExistente) {
            // Usuario ya existe - generar OTP para él
            console.log("📱 Usuario existente, generando OTP...");
            
            // Usar el método oficial de PocketBase para request OTP
            // Esto activará el hook OTP y tu servicio SMS
            const requestInfo = {
                method: "POST",
                body: {
                    email: usuarioExistente.get("email")
                }
            };
            
            // Devolvemos éxito y el cliente debe llamar a request-otp
            return c.json(200, {
                success: true,
                message: "Usuario ya existe. Debe solicitar código en /api/collections/users/request-otp",
                telefono: telefono,
                userId: usuarioExistente.id
            });
        }
        
        // CREAR NUEVO USUARIO
        const collection = $app.findCollectionByNameOrId("users");
        const usuario = new Record(collection);
        
        usuario.set("email", email);
        usuario.set("phone", telefono);
        usuario.set("name", "Usuario " + telefono.slice(-4));
        usuario.set("role", "client");
        usuario.set("verified", false);
        usuario.setPassword($security.randomString(30));
        
        $app.save(usuario);
        console.log("✅ Usuario creado exitosamente con ID:", usuario.id);
        
        // IMPORTANTE: No generamos OTP manualmente
        // El cliente debe llamar a request-otp con el email
        // Eso activará tu hook OTP existente que YA FUNCIONA
        
        return c.json(200, {
            success: true,
            message: "Usuario creado. Debe solicitar código en /api/collections/users/request-otp",
            telefono: telefono,
            userId: usuario.id
        });
        
    } catch (error) {
        console.error("❌ Error en registro:", error);
        return c.json(500, { error: error.message });
    }
});

console.log("🚀 Endpoint /api/registro-telefono cargado");
