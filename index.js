let copy = document.getElementById("copy")
copy.addEventListener("click", function() {
    let copyText = document.getElementById("resPara")
    navigator.clipboard.writeText(copyText.innerHTML)
    
    copy.innerHTML = "Copied!"
    copy.disabled = true
})

let paste = document.getElementById("paste")
paste.addEventListener("click", async function() {
    let pasteText = await navigator.clipboard.readText()
    document.getElementById("text").value = pasteText
})

let submitButton = document.getElementById("submit")

let crypto = document.getElementById("crypto")

crypto.addEventListener("change", function(event) {
    let crypto = document.getElementById("crypto").value
    submitButton.innerText = crypto
})

let myForm = document.getElementById("myForm")

myForm.addEventListener("submit", function(event) {
    event.preventDefault()

    copy.innerHTML = "Copy"
    copy.disabled = false
    
    let key = document.getElementById("key").value
    let text = document.getElementById("text").value
    let algorithm = document.getElementById("algorithm")
    
    if (crypto.value === "Encrypt")
        encrypt(key, text, algorithm)
    else if (crypto.value === "Decrypt")
        decrypt(key, text, algorithm)

})

function encrypt(key, plaintext, algorithm) {
    let output = "";

    switch (algorithm.value) {
        case "AES":
            output = CryptoJS.AES.encrypt(plaintext, key)
            break
        case "DES":
            output = CryptoJS.DES.encrypt(plaintext, key)
            break
        case "3_DES":
            output = CryptoJS.TripleDES.encrypt(plaintext, key)
            break
        case "OTP":
            output = otp(plaintext, key, "encrypt", true);
            break
        default:
            console.log("No crypto selected")
            output = "No crypto selected"
    }

    document.getElementById("resPara").innerHTML = output
}

function decrypt(key, cyphertext, algorithm) {
    let output = "";

    switch (algorithm.value) {
        case "AES":
            output = CryptoJS.AES.decrypt(cyphertext, key).toString(CryptoJS.enc.Utf8)
            break
        case "DES":
            output = CryptoJS.DES.decrypt(cyphertext, key).toString(CryptoJS.enc.Utf8)
            break
        case "3_DES":
            output = CryptoJS.TripleDES.decrypt(cyphertext, key).toString(CryptoJS.enc.Utf8)
            break
        case "OTP":
            output = otp(cyphertext, key, "decrypt", true);
            break
        default:
            console.log("No crypto selected")
            output = "No crypto selected"
    }
    
    if (output === "")
        output = "Wrong key"

    document.getElementById("resPara").innerHTML = output
}
