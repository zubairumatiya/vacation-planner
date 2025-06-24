"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidPassword = isValidPassword;
function isValidPassword(password) {
    var regex = /^(?=.*[a-z])(?=.*\d)(?=.*[-!@#$%^&*()_+=[\]{}\\|`~:;"'<>,.?/])(?=.*[A-Z])[A-Za-z\d!@#$%^&*()_+=[\]{}\\|`~:;"'<>,.?/-]{8,72}$/;
    return regex.test(password);
}
