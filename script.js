var scorm = pipwerks.SCORM;
scorm.version = "1.2";

document.getElementById('saveProgress').addEventListener('click', function () {
    var statusElement = document.getElementById('status');

    if (scorm.init()) {
        scorm.set("cmi.core.lesson_status", "completed");
        scorm.set("cmi.core.score.raw", "85"); // Puntuación ficticia
        scorm.save();
        scorm.quit();
        statusElement.innerText = "Progress saved successfully!";
    } else {
        statusElement.innerText = "Failed to connect to SCORM API.";
    }
});