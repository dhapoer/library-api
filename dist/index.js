"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const cors_1 = __importDefault(require("cors"));
const supabase_js_1 = require("@supabase/supabase-js");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
const supabase = (0, supabase_js_1.createClient)(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');
app.get("/", (_, response) => response.json({ info: "Node.js, Express, and Postgres API" }));
// Register User
app.post("/api/user/register", (request, response) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { error } = yield supabase.from("User").insert(request.body);
        if (error) {
            return response.status(400).json(error);
        }
        response.status(200).json(request.body);
    }
    catch (error) {
        response.send({ error });
    }
}));
// User Login
app.post("/api/user/login", (request, response) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const email = request.body.email;
        const password = request.body.password;
        const { data, error } = yield supabase.from("User")
            .select(`
      id,
      email,
      password
    `)
            .eq("email", email);
        if (error) {
            return response.status(400).json(error);
        }
        if (data !== null && data.length === 1) {
            const userData = data[0];
            if (userData.password === password) {
                yield supabase.from("UserSession").insert({ "user_id": userData.id });
                const { data, error } = yield supabase.from("UserSession")
                    .select('auth_token')
                    .eq("user_id", userData.id)
                    .is("deleted_at", null)
                    .order("created_at", { ascending: false })
                    .single();
                if (error) {
                    return response.status(400).json(error);
                }
                return response.send({ token: data === null || data === void 0 ? void 0 : data.auth_token });
            }
        }
        else {
            return response.status(400).json({ "error": "Wrong Password" });
        }
        return response.send({ data });
    }
    catch (error) {
        return response.send({ error });
    }
}));
// User Logout
app.delete("/api/user/logout", (request, response) => __awaiter(void 0, void 0, void 0, function* () {
    if (!request.headers.authorization)
        return response.status(403).json({ error: 'No credentials sent!' });
    try {
        const userId = yield getUserIdFromAuthToken(request.headers.authorization);
        yield supabase
            .from("UserSession")
            .delete()
            .eq("user_id", userId);
        return response.send({});
    }
    catch (error) {
        return response.send({ error });
    }
}));
// Get user profile
app.get("/api/user/profile", (request, response) => __awaiter(void 0, void 0, void 0, function* () {
    if (!request.headers.authorization)
        return response.status(403).json({ error: 'No credentials sent!' });
    try {
        const userId = yield getUserIdFromAuthToken(request.headers.authorization);
        const { data, error } = yield supabase.from("User")
            .select(`
      name,
      email
    `)
            .eq('id', userId)
            .single();
        if (error) {
            return response.status(400).json(error);
        }
        return response.status(200).json(data);
    }
    catch (error) {
        return response.send({ error });
    }
}));
// Get all categories
app.get("/api/category", (request, response) => __awaiter(void 0, void 0, void 0, function* () {
    if (!request.headers.authorization)
        return response.status(403).json({ error: 'No credentials sent!' });
    try {
        const userId = yield getUserIdFromAuthToken(request.headers.authorization);
        const { data, error } = yield supabase.from("BookCategory")
            .select(`
    id,
    category_name,
    category_description,
    is_active
  `).eq("user_id", userId);
        return response.send(data);
    }
    catch (error) {
        return response.send({ error });
    }
}));
// Get a category
app.get("/api/category/:id", (request, response) => __awaiter(void 0, void 0, void 0, function* () {
    if (!request.headers.authorization)
        return response.status(403).json({ error: 'No credentials sent!' });
    try {
        const userId = yield getUserIdFromAuthToken(request.headers.authorization);
        const { data, error } = yield supabase
            .from("BookCategory")
            .select(`
        id,
        category_name,
        category_description,
        is_active
      `)
            .eq("id", request.params.id)
            .order("id", { ascending: true })
            .eq("user_id", userId)
            .single();
        if (error)
            return response.status(400).json(error);
        return response.send(data);
    }
    catch (error) {
        return response.send({ error });
    }
}));
// Post a category
app.post("/api/category/create", (request, response) => __awaiter(void 0, void 0, void 0, function* () {
    if (!request.headers.authorization)
        return response.status(403).json({ error: 'No credentials sent!' });
    try {
        const userId = yield getUserIdFromAuthToken(request.headers.authorization);
        const error = yield supabase.from("BookCategory").insert({
            "category_name": request.body.category_name,
            "category_description": request.body.category_description,
            "is_active": request.body.is_active,
            "user_id": userId,
        });
        if (error) {
            return response.status(400).json(error);
        }
        return response.status(200).json(request.body);
    }
    catch (error) {
        return response.send({ error });
    }
}));
// Update a category
app.put("/api/category/update", (request, response) => __awaiter(void 0, void 0, void 0, function* () {
    if (!request.headers.authorization)
        return response.status(403).json({ error: 'No credentials sent!' });
    try {
        const userId = yield getUserIdFromAuthToken(request.headers.authorization);
        const { error: err } = yield supabase
            .from("BookCategory")
            .update({
            "category_name": request.body.category_name,
            "category_description": request.body.category_description,
            "is_active": request.body.is_active
        })
            .eq("id", request.body.id);
        if (err) {
            return response.status(400).json(err);
        }
        const { data, error } = yield supabase.from("BookCategory")
            .select(`
        id,
        category_name,
        category_description,
        is_active
    `)
            .eq("id", request.body.id)
            .single();
        if (error) {
            return response.status(400).json(error);
            ``;
        }
        return response.status(200).send(data);
    }
    catch (error) {
        return response.send({ error });
    }
}));
// Delete a category
app.delete("/api/category/:id", (request, response) => __awaiter(void 0, void 0, void 0, function* () {
    if (!request.headers.authorization)
        return response.status(403).json({ error: 'No credentials sent!' });
    try {
        const userId = yield getUserIdFromAuthToken(request.headers.authorization);
        const { error: err } = yield supabase
            .from("BookCategory")
            .delete()
            .eq("id", request.params.id);
        if (err) {
            return response.status(400).json(err);
        }
        const { data, error } = yield supabase.from("BookCategory").select(`
        id,
        category_name,
        category_description,
        is_active
      `).eq("id", request.params.id)
            .single();
        if (error) {
            return response.status(400).json(error);
        }
        return response.send(data);
    }
    catch (error) {
        return response.send({ error });
    }
}));
app.listen(port, () => console.log(new Date().toLocaleTimeString() +
    `: Server is running on port ${port}...`));
// utils function
function getUserIdFromAuthToken(auth) {
    return __awaiter(this, void 0, void 0, function* () {
        const authToken = auth.split(" ");
        const token = authToken.length > 1 ? authToken[1] : "";
        const userSession = yield supabase.from("UserSession")
            .select('user_id')
            .eq("auth_token", token);
        return userSession.data ? userSession.data[0].user_id : "";
    });
}
