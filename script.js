function saveClipboard() {

    let text =
    document.getElementById("clipboard").value;

    fetch("clipboard", {

        method: "POST",

        headers: {

            "Content-Type":
            "application/x-www-form-urlencoded"

        },

        body:
        "text=" + encodeURIComponent(text)

    })

    .then(response => response.text())

    .then(data => {

        alert("Saved Successfully");

    });

}

function getClipboard() {

    fetch("clipboard")

    .then(response => response.text())

    .then(data => {

        document.getElementById("output").value = data;

    });

}



// File Upload

let uploadedFile = "";

document.getElementById("uploadForm")
.addEventListener("submit", function(e){

    e.preventDefault();

    let formData =
    new FormData();

    let file =
    document.getElementById("file").files[0];

    formData.append("file", file);

    fetch("upload", {

        method: "POST",

        body: formData

    })

    .then(response => response.text())

    .then(data => {

        uploadedFile = file.name;

        alert("File Uploaded Successfully");

        document.getElementById("downloadLink")
        .href =
        "download?file=" + uploadedFile;

    });

});


function togglePassword() {

    let password =
    document.getElementById("password");

    if(password.type === "password") {

        password.type = "text";

    }

    else {

        password.type = "password";

    }

}