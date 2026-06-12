"use strict";
// Formule di gioco — UNICA fonte di verità condivisa fra backend e mobile.
// Se cambi una formula qui, entrambi i lati restano allineati.
Object.defineProperty(exports, "__esModule", { value: true });
exports.xpForNextLevel = xpForNextLevel;
exports.streakMultiplier = streakMultiplier;
exports.calcRank = calcRank;
/** XP necessari per salire dal livello dato a quello successivo. */
function xpForNextLevel(level) {
    return level * 100;
}
/** Moltiplicatore XP in base alla streak di giorni consecutivi. */
function streakMultiplier(streak) {
    if (streak >= 30)
        return 1.5;
    if (streak >= 14)
        return 1.25;
    if (streak >= 7)
        return 1.1;
    return 1.0;
}
/** Rank in base al livello. */
function calcRank(level) {
    if (level >= 100)
        return 'S';
    if (level >= 75)
        return 'A';
    if (level >= 50)
        return 'B';
    if (level >= 25)
        return 'C';
    if (level >= 10)
        return 'D';
    return 'E';
}
