import api from "./api.js";

export async function loginUser(credentials) {
    const response = await api.post("/auth/login", credentials);

    return response.data;
}