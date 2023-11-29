const socket = io();

const link = document.getElementById("link");
const call = document.getElementById("call");
const myCam = document.getElementById("myCam");
const muteBtn = document.getElementById("mute");
const mediaBtn = document.getElementById("media");
const screenBtn = document.getElementById("screen");
const room = document.getElementById("room");
const form = room.querySelector("form");
const camerasSelect = document.getElementById("cameras");

let roomName;
let myStream;
let myScreen;
let muted = false;
let cameraOff = false
let screenOff = true;
let myPeerConnection;

call.hidden = true;

async function getCameras(){
    try{
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((device) => device.kind === "videoinput");
        const currentCamera = myStream.getVideoTracks()[0];
        cameras.forEach((camera) => {
        const option = document.createElement("option");
        option.value = camera.deviceId;
        option.innerText = camera.label;
        if (currentCamera.label === camera.label) {
            option.selected = true;
        }
        camerasSelect.appendChild(option);
        });
    } catch(e){
        console.log(e);
    }
}

async function getScreen(){
    try{
        myScreen = await navigator.mediaDevices.getDisplayMedia({
            audio: true,
            video: {
                cursor: "always",
            },
        });
        myCam.srcObject = myScreen;
    } catch(e){
        console.log(e);
    }
}

async function getCam(deviceId) {
    const initialConstrains = {
        audio: true,
        video: { facingMode: "user" },
    };
    const cameraConstraints = {
        audio: true,
        video: { deviceId: { exact: deviceId } },
    };
    try {
        myStream = await navigator.mediaDevices.getUserMedia(
        deviceId ? cameraConstraints : initialConstrains
        );
        myCam.srcObject = myStream;
        if (!deviceId) {
        await getCameras();
        }
    } catch (e) {
        console.log(e);
    }
}

function stopCam(){
    myStream.getVideoTracks().forEach(function (track) {
        track.stop();
    })
}

function stopScreen(){
    myScreen.getVideoTracks().forEach(function (track) {
        track.stop();
    })
}

function handleMuteClick() {
    if (cameraOff) {
        myScreen
        .getAudioTracks()
        .forEach((track) => (track.enabled = !track.enabled));
    } else {
        myStream
        .getAudioTracks()
        .forEach((track) => (track.enabled = !track.enabled));
    }
        
    if (!muted) {
        muteBtn.innerText = "Unmute";
        muted = true;
    } else {
        muteBtn.innerText = "Mute";
        muted = false;
    }
    console.log(muteBtn.innerText);
}

function handleMediaClick() {
    myScreen
        .getVideoTracks()
        .forEach((track) => (track.enabled = !track.enabled));
    myStream
        .getVideoTracks()
        .forEach((track) => (track.enabled = !track.enabled));
    if (cameraOff) {
        mediaBtn.innerText = "Media Off";
        cameraOff = false;
    } else {
        mediaBtn.innerText = "Media On";
        cameraOff = true;
    }
}

async function handleScreenClick() {
    if (screenOff) {
        screenBtn.innerTxt = "Cam";
        stopCam();
        await getScreen();
    } else {
        screenBtn.innerTxt = "Screen";
        stopScreen();
        await getCam();
    }
    screenOff = !screenOff;
}

async function handleCameraChange() {
    await getCam(camerasSelect.value);
}

async function initRoom(){
    call.hidden = false;
    await getCam();
    makeConnection();
}

async function handleRoomSubmit(event) {
    event.preventDefault();
    const input = form.querySelector("input");
    const h2 = form.querySelector("h2");
    roomName = input.value;
    input.value = "";
    h2.innerText = `Room ${roomName}`;
    await initRoom();
    socket.emit("enter_room", roomName);
}

function makeConnection(){
    myPeerConnection = new RTCPeerConnection();
    myPeerConnection.addEventListener("icecandidate", handleIce);
    myPeerConnection.addEventListener("addstream", handleAddStream);
    myStream
    .getTracks()
    .forEach(track => myPeerConnection.addTrack(track, myStream));
}

function handleIce(data){
    socket.emit("ice", data.candidate, roomName); 
}

function handleAddStream(data){
    myCam.srcObject = data.stream;
    socket.emit("ice", data.candidate, roomName); 
}

socket.on("welcome", async (id)=>{
    const offer = await myPeerConnection.createOffer();
    const h2 = room.querySelector("h2");
    h2.innerText = `Room ${roomName} (${newCount})`;
    myPeerConnection.setLocalDescription(offer);
    socket.emit("offer", offer, roomName);
});

socket.on("offer", async (offer) => {
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
    socket.emit("answer", answer, roomName);
});

socket.on("answer", (answer) => {
    myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", ice =>{
    myPeerConnection.addIceCandidate(ice);
});

socket.on("bye", (id) => {
    console.log(id + "님이 나갔습니다.");
});

form.addEventListener("submit", handleRoomSubmit);
muteBtn.addEventListener("click", handleMuteClick);
mediaBtn.addEventListener("click", handleMediaClick);
screenBtn.addEventListener("click", handleScreenClick);
camerasSelect.addEventListener("input", handleCameraChange);  