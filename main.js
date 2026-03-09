const fs = require("fs");

// HELPER FUNCTIONS

function timeToSeconds(timeStr) {
    const trimmed = timeStr.trim();
    const parts = trimmed.split(" ");
    const time = parts[0];
    const period = parts[1].toLowerCase();
    const [hours, minutes, seconds] = time.split(":").map(Number);
    
    let hours24 = hours;
    if (period === "pm" && hours !== 12) {
        hours24 = hours + 12;
    } else if (period === "am" && hours === 12) {
        hours24 = 0;
    }
    
    return hours24 * 3600 + minutes * 60 + seconds;
}

function secondsToTimeString(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function secondsToLongTimeString(totalSeconds) {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function parseTimeToSeconds(timeStr) {
    const parts = timeStr.trim().split(":");
    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    const seconds = Number(parts[2]);
    
    return hours * 3600 + minutes * 60 + seconds;
}

function getDayOfWeek(dateStr) {
    const date = new Date(dateStr);
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    return days[date.getDay()];
}

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    const startSeconds = timeToSeconds(startTime);
    const endSeconds = timeToSeconds(endTime);
    
    let durationSeconds = endSeconds - startSeconds;
    
    if (durationSeconds < 0) {
        durationSeconds += 24 * 3600;
    }
    
    return secondsToTimeString(durationSeconds);
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    const startSeconds = timeToSeconds(startTime);
    const endSeconds = timeToSeconds(endTime);
    
    const deliveryStartSeconds = 8 * 3600;  // 8:00 AM
    const deliveryEndSeconds = 22 * 3600;   // 10:00 PM
    const secondsInDay = 24 * 3600;
    
    let idleSeconds = 0;
    
    if (endSeconds >= startSeconds) {

        if (startSeconds < deliveryStartSeconds) {
            idleSeconds += deliveryStartSeconds - startSeconds;
        }
        if (endSeconds > deliveryEndSeconds) {
            idleSeconds += endSeconds - deliveryEndSeconds;
        }
    } else {

        if (startSeconds < deliveryStartSeconds) {
            idleSeconds += deliveryStartSeconds - startSeconds;
            idleSeconds += secondsInDay - deliveryEndSeconds;
        } else if (startSeconds <= deliveryEndSeconds) {
            idleSeconds += secondsInDay - deliveryEndSeconds;
        } else {
            idleSeconds += secondsInDay - startSeconds;
        }
        
        if (endSeconds < deliveryStartSeconds) {
            idleSeconds += endSeconds;
        } else if (endSeconds <= deliveryEndSeconds) {
            idleSeconds += deliveryStartSeconds;
        } else {
            idleSeconds += deliveryStartSeconds + (endSeconds - deliveryEndSeconds);
        }
    }
    
    return secondsToTimeString(idleSeconds);
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    const shiftSeconds = parseTimeToSeconds(shiftDuration);
    const idleSeconds = parseTimeToSeconds(idleTime);
    
    const activeSeconds = shiftSeconds - idleSeconds;
    
    return secondsToTimeString(activeSeconds);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    const activeSeconds = parseTimeToSeconds(activeTime);
    
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    
    let quotaSeconds;
    
    if (year === 2025 && month === 4 && day >= 10 && day <= 30) {
        quotaSeconds = 6 * 3600;
    } else {
        quotaSeconds = 8 * 3600 + 24 * 60;
    }
    
    return activeSeconds >= quotaSeconds;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    const { driverID, driverName, date, startTime, endTime } = shiftObj;
    
    let fileContent = "";
    if (fs.existsSync(textFile)) {
        fileContent = fs.readFileSync(textFile, "utf-8");
    }
    
    const lines = fileContent.trim() ? fileContent.split("\n") : [];
    
    for (const line of lines) {
        if (!line) continue;
        const fields = line.split(",");
        if (fields[0].trim() === driverID && fields[2].trim() === date) {
            return {};
        }
    }
    
    const shiftDuration = getShiftDuration(startTime, endTime);
    const idleTime = getIdleTime(startTime, endTime);
    const activeTime = getActiveTime(shiftDuration, idleTime);
    const quota = metQuota(date, activeTime);
    const hasBonus = false;
    
    const newRecord = {
        driverID,
        driverName,
        date,
        startTime,
        endTime,
        shiftDuration,
        idleTime,
        activeTime,
        metQuota: quota,
        hasBonus
    };
    
    const csvLine = `${driverID},${driverName},${date},${startTime},${endTime},${shiftDuration},${idleTime},${activeTime},${quota},${hasBonus}`;
    
    let insertIndex = lines.length;
    let lastDriverIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
        if (!lines[i]) continue;
        const fields = lines[i].split(",");
        if (fields[0].trim() === driverID) {
            lastDriverIndex = i;
        }
    }
    
    if (lastDriverIndex !== -1) {
        insertIndex = lastDriverIndex + 1;
    }
    
    lines.splice(insertIndex, 0, csvLine);
    
    fs.writeFileSync(textFile, lines.join("\n") + "\n", "utf-8");
    
    return newRecord;
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    const fileContent = fs.readFileSync(textFile, "utf-8");
    const lines = fileContent.trim().split("\n");
    
    for (let i = 0; i < lines.length; i++) {
        if (!lines[i]) continue;
        const fields = lines[i].split(",");
        if (fields[0].trim() === driverID && fields[2].trim() === date) {
            fields[9] = String(newValue);
            lines[i] = fields.join(",");
            break;
        }
    }
    
    fs.writeFileSync(textFile, lines.join("\n") + "\n", "utf-8");
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    const fileContent = fs.readFileSync(textFile, "utf-8");
    const lines = fileContent.trim().split("\n");
    
    const normalizedMonth = String(month).padStart(2, "0");
    
    let driverFound = false;
    let bonusCount = 0;
    
    for (const line of lines) {
        if (!line) continue;
        const fields = line.split(",");
        const currentDriverID = fields[0].trim();
        const currentDate = fields[2].trim();
        const currentHasBonus = fields[9].trim().toLowerCase() === "true";
        
        if (currentDriverID === driverID) {
            driverFound = true;
            const dateMonth = currentDate.substring(5, 7);
            if (dateMonth === normalizedMonth && currentHasBonus) {
                bonusCount++;
            }
        }
    }
    
    return driverFound ? bonusCount : -1;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    const fileContent = fs.readFileSync(textFile, "utf-8");
    const lines = fileContent.trim().split("\n");
    
    const normalizedMonth = String(month).padStart(2, "0");
    let totalSeconds = 0;
    
    for (const line of lines) {
        if (!line) continue;
        const fields = line.split(",");
        const currentDriverID = fields[0].trim();
        const currentDate = fields[2].trim();
        const activeTime = fields[7].trim();
        
        if (currentDriverID === driverID) {
            const dateMonth = currentDate.substring(5, 7);
            if (dateMonth === normalizedMonth) {
                totalSeconds += parseTimeToSeconds(activeTime);
            }
        }
    }
    
    return secondsToLongTimeString(totalSeconds);
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================


// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================


module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
