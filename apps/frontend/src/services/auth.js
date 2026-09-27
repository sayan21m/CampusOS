import api from "./api.js";

export async function loginUser(credentials) {
    const { data } = await api.post("/auth/login", credentials);

    return data.result;
}

export async function registerUser({ name, email, password }) {
    const { data } = await api.post("/auth/register", {
        name,
        email,
        password,
    });

    return data;
}

export async function requestPasswordReset({ email }) {
    const { data } = await api.post("/auth/forgot-password", { email });

    return data;
}