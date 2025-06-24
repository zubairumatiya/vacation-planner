"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidEmail = isValidEmail;
function isValidEmail(email) {
    var regex = /^\w+[\w.-]*@[A-Za-z0-9]+(?!.*\.\.)(?!.*(\.-|-\.))\.[A-Za-z0-9.-]*[A-Za-z0-9]+$/;
    return regex.test(email);
}
