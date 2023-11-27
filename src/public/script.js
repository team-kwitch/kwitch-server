const socket = io();

const link = document.getElementById("link");
const call = document.getElementById("call");
const myCam = document.getElementById("myCam");
const muteBtn = document.getElementById("mute");
const cameraBtn = document.getElementById("cam");
const room = document.getElementById("room");
const form = room.querySelector("form");
const camerasSelect = document.getElementById("cameras");

let roomName;
let myStream;
let muted = false;
let cameraOff = false;
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
        console.log(e)
    }
}

async function getMedia(deviceId) {
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

function handleMuteClick() {
    myStream
        .getAudioTracks()
        .forEach((track) => (track.enabled = !track.enabled));
    if (!muted) {
        muteBtn.innerText = "Unmute";
        muted = true;
    } else {
        muteBtn.innerText = "Mute";
        muted = false;
    }
    console.log(muteBtn.innerText);
}

function handleCameraClick() {
    myStream
        .getVideoTracks()
        .forEach((track) => (track.enabled = !track.enabled));
    if (cameraOff) {
        cameraBtn.innerText = "Turn Camera Off";
        cameraOff = false;
    } else {
        cameraBtn.innerText = "Turn Camera On";
        cameraOff = true;
    }
    console.log(cameraBtn.innerText);
}

async function handleCameraChange() {
    await getMedia(camerasSelect.value);
}

async function initRoom(){
    call.hidden = false;
    await getMedia();
    makeConnection();
}

async function handleRoomSubmit(event) {
    event.preventDefault();
    const input = form.querySelector("input");
    const h2 = form.querySelector("h2");
    h2.innerText = `Room ${roomName}`;
    await initRoom();
    socket.emit("enter_room", input.value);
    roomName = input.value;
    input.value = "";
}

function makeConnection(){
    myPeerConnection = new RTCPeerConnection();
    myStream
    .getTracks()
    .forEach(track => myPeerConnection.addTrack(track, myStream));
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
})

socket.on("answer", (answer) => {
    myPeerConnection.setRemoteDescription(answer);
  });

socket.on("bye", (id) => {
    console.log(id + "님이 나갔습니다.");
});

form.addEventListener("submit", handleRoomSubmit);
muteBtn.addEventListener("click", handleMuteClick);
cameraBtn.addEventListener("click", handleCameraClick);
camerasSelect.addEventListener("input", handleCameraChange);  