const socket = io();

const link = document.getElementById("link");
const call = document.getElementById("call");
const myCam = document.getElementById("myCam");
const muteBtn = document.getElementById("mute");
const mediaBtn = document.getElementById("media");
const screenBtn = document.getElementById("screen");
const room = document.getElementById("room");
const form = room.querySelector("form");
const input = form.querySelector("input");
const camerasSelect = document.getElementById("cameras");
const h2 = document.getElementById("home");

let roomName;
let myStream;
let myScreen;
let muted = false;
let cameraOff = false
let screenOff = true;
let myPeerConnection;

call.hidden = true;

async function getCameras(){
    console.log("start getCameras");
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
            audio: false,
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
    console.log("start getCam");
    const initialConstrains = {
        audio: false,
        video: { facingMode: "user" },
    };
    const cameraConstraints = {
        audio: false,
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
    });
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
        await getCam()
    }
    screenOff = !screenOff;
}

async function handleCameraChange() {
    await getCam(camerasSelect.value);
    if(myPeerConnection){
        const videoTrack = myStream.getVideoTracks()[0];
        const videoSender = myPeerConnection
            .getSenders()
            .find((sender) => sender.track.kind === "video");
        videoSender.replaceTrack(videoTrack);
    }
}

async function initRoom(){
    call.hidden = false;
    await getCam();
    makeConnection();
}

async function handleRoomSubmit(event) {
    event.preventDefault();
    roomName = input.value;
    input.value = "";
    console.log(`enter ${roomName}`);
    await initRoom();
    socket.emit("enter_room", roomName);
}

function makeConnection(){
    console.log("makeConnection");
    myPeerConnection = new RTCPeerConnection({
        iceServers: [
            {
                urls: [
                    "stun:ntk-turn-2.xirsys.com"
                ]
            }, 
            {
                username: "B2kXuLHJAgCF6PrMNkYi5LqmdjYEzg7I4ARqwg3NRMIRpT8DEU2db2VClTjEMVAaAAAAAGVoJQdibHVlYmVycnk=",
                credential: "c9f127e4-8f45-11ee-bdd8-0242ac120004",
                urls: [
                    "turn:ntk-turn-2.xirsys.com:80?transport=udp",
                    "turn:ntk-turn-2.xirsys.com:3478?transport=udp",
                    "turn:ntk-turn-2.xirsys.com:80?transport=tcp",
                    "turn:ntk-turn-2.xirsys.com:3478?transport=tcp",
                    "turns:ntk-turn-2.xirsys.com:443?transport=tcp",
                    "turns:ntk-turn-2.xirsys.com:5349?transport=tcp"
                ]
            }
        ]
    });
    console.log("ice, track");
    myPeerConnection.addEventListener("icecandidate", handleIce);
    myPeerConnection.addEventListener("track", handleAddStream);
    myStream
        .getTracks()
        .forEach((track) => myPeerConnection.addTrack(track, myStream));
    console.log("end makeConnection");    
}

function handleIce(data){
    console.log(`handle ice ${roomName}`);
    socket.emit("ice", data.candidate, roomName); 
}

function handleAddStream(data){
    console.log(`add stream ${roomName}`);
    const myPeer = document.getElementById("myPeer");
    myPeer.srcObject = data.streams[0];
}

const button = document.getElementById("link");
function create(){
    const input = document.getElementById("createName").value;
    console.log(input);

    socket.emit('create_room', input, "재밌겠다");
}

socket.on("welcome", async () => {
    console.log("welcome");
    const offer = await myPeerConnection.createOffer();
    h2.innerText = `Room ${roomName}`;
    myPeerConnection.setLocalDescription(offer);
    console.log("send offer");
    socket.emit("offer", offer, roomName);
});

socket.on("offer", async (offer) => {
    myPeerConnection.setRemoteDescription(offer);
    const answer = await myPeerConnection.createAnswer();
    myPeerConnection.setLocalDescription(answer);
    socket.emit("answer", answer, roomName);
    console.log("send answer");
});

socket.on("answer", (answer) => {
    console.log("receive answer");
    myPeerConnection.setRemoteDescription(answer);
});

socket.on("ice", (ice) =>{
    console.log("receive ice");
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