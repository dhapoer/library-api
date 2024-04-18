import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL  || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
);

app.get("/", (_, response) =>
  response.json({ info: "Node.js, Express, and Postgres API" })
);

// Register User
app.post("/api/user/register", async (request, response) => {
  try {
    const { error } = await supabase.from("User").insert(request.body);
    if (error) {
      return response.status(400).json(error);
    }
    response.status(200).json(request.body);
  } catch (error) {
    response.send({ error });
  }
});

// User Login
app.post("/api/user/login", async (request, response) => {
  try {
    const email = request.body.email;
    const password = request.body.password;
    const { data, error } = await supabase.from("User")
    .select(`
      id,
      email,
      password
    `)
    .eq("email", email);

    if (error) {
      return response.status(400).json(error);
    }
    
    if (data !== null && data.length === 1){
      const userData = data[0];
      if (userData.password === password) {
        await supabase.from("UserSession").insert({"user_id": userData.id});

        const {data , error} = await supabase.from("UserSession")
        .select('auth_token')
        .eq("user_id", userData.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .single();

        if (error) {
          return response.status(400).json(error);
        }
        return response.send({ token: data?.auth_token });
      }
    } else {
      return response.status(400).json({"error": "Wrong Password"});
    }
    return response.send({ data });
  } catch (error) {
    return response.send({ error });
  }
});

// User Logout
app.delete("/api/user/logout", async (request, response) => {
  if (!request.headers.authorization) return response.status(403).json({ error: 'No credentials sent!' });
  try {
    const userId = await getUserIdFromAuthToken(request.headers.authorization)
    await supabase
      .from("UserSession")
      .delete()
      .eq("user_id", userId);
    return response.send({});
  } catch (error) {
    return response.send({ error });
  }
});

// Get user profile
app.get("/api/user/profile", async (request, response) => {
  if (!request.headers.authorization) return response.status(403).json({ error: 'No credentials sent!' });
  try {
    const userId = await getUserIdFromAuthToken(request.headers.authorization)
    const { data, error } = await supabase.from("User")
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
  } catch (error) {
    return response.send({ error });
  }
});

// Get all categories
app.get("/api/category", async (request, response) => {
  if (!request.headers.authorization) return response.status(403).json({ error: 'No credentials sent!' });
  try {
    const userId = await getUserIdFromAuthToken(request.headers.authorization)
    const { data, error } = await supabase.from("BookCategory")
    .select(`
    id,
    category_name,
    category_description,
    is_active
  `).eq("user_id", userId);

    return response.send(data);
  } catch (error) {
    return response.send({ error });
  }
});

// Get a category
app.get("/api/category/:id", async (request, response) => {
  if (!request.headers.authorization) return response.status(403).json({ error: 'No credentials sent!' });
  try {
    const userId = await getUserIdFromAuthToken(request.headers.authorization)
    const { data, error } = await supabase
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

    if (error) return response.status(400).json(error);

    return response.send(data);
  } catch (error) {
    return response.send({ error });
  }
});

// Post a category
app.post("/category/create", async (request, response) => {
  if (!request.headers.authorization) return response.status(403).json({ error: 'No credentials sent!' });
  try {
    const userId = await getUserIdFromAuthToken(request.headers.authorization)
    const error = await supabase.from("BookCategory").insert({
      "category_name": request.body.category_name,
      "category_description": request.body.category_description,
      "is_active": request.body.is_active,
      "user_id": userId,
    });
    if (error) {
      return response.status(400).json(error);
    }
    return response.status(200).json(request.body);
  } catch (error) {
    return response.send({ error });
  }
});

// Update a category
app.put("/api/category/update", async (request, response) => {
  if (!request.headers.authorization) return response.status(403).json({ error: 'No credentials sent!' });
  try {
    const userId = await getUserIdFromAuthToken(request.headers.authorization);
    const { error: err } = await supabase
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
    
    const { data, error } = await supabase.from("BookCategory")
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
  ``}
    return response.status(200).send(data);
  } catch (error) {
    return response.send({ error });
  }
});

// Delete a category
app.delete("/api/category/:id", async (request, response) => {
  if (!request.headers.authorization) return response.status(403).json({ error: 'No credentials sent!' });
  try {
    const userId = await getUserIdFromAuthToken(request.headers.authorization);

    const { error: err } = await supabase
      .from("BookCategory")
      .delete()
      .eq("id", request.params.id)

    if (err) {
      return response.status(400).json(err);
    }
    
    const { data, error } = await supabase.from("BookCategory").select(
      `
        id,
        category_name,
        category_description,
        is_active
      `
    ).eq("id", request.params.id)
    .single();

    if (error) {
      return response.status(400).json(error);
    }
    return response.send(data);
  } catch (error) {
    return response.send({ error });
  }
});


app.listen(port, () =>
  console.log(
    new Date().toLocaleTimeString() +
      `: Server is running on port ${port}...`
  )
);

// utils function
async function getUserIdFromAuthToken(auth: string){
  const authToken = auth.split(" ");
  const token = authToken.length > 1 ? authToken[1] : "";
  const userSession = await supabase.from("UserSession")
  .select('user_id')
  .eq("auth_token", token);
  
  return userSession.data ? userSession.data[0].user_id: "";
}