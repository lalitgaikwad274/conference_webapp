console.log('In main.js');

var usernameInput = document.querySelector('#username');
var btnJoin = document.querySelector('#btn-join');

var mapPeers = {};

var mapScreenPeers = {};
var screenShared = false;

var btnShareScreen = document.querySelector('#btn-share-screen');

var username;

var loc = window.location;
var wsStart = "ws://";

if (loc.protocol == "https:") {
    wsStart = "wss://";
}

const roomName = JSON.parse(document.getElementById('room-name').textContent);
var endPoint = wsStart + loc.host + 
               '/ws/chat/'
               + roomName
               + '/';


console.log("endPoint; ", endPoint);

var webSocket;

function webSocketOnMessage(event) {

    var parsedData = JSON.parse(event.data);

    var peerUsername = parsedData['peer'];
    var action = parsedData['action'];

    if (username == peerUsername) {
        return;
    }

    var remoteScreenSharing = parsedData['message']['local_screen_sharing'];
    console.log('remoteScreenSharing: ', remoteScreenSharing);


    var receiver_channel_name = parsedData['message']['receiver_channel_name'];

    if (action == 'new-peer') {
        console.log('new peer : ', peerUsername);
        createOfferer(peerUsername, false, remoteScreenSharing, receiver_channel_name);

        if (screenShared && !remoteScreenSharing) {
            console.log('screeShared log');
            createOfferer(peerUsername, true, remoteScreenSharing, receiver_channel_name);

        }
        return;
    }

    var localScreenSharing = parsedData['message']['remote_screen_sharing'];

    if (action == 'new-offer') {
        console.log('Got new offer from ', peerUsername);

        var offer = parsedData['message']['sdp'];
        //console.log('new-offer created: ',offer);
        var peer = createAnswerer(offer, peerUsername, localScreenSharing, remoteScreenSharing, receiver_channel_name);

        return;
    }

    if (action == 'new-answer') {
        console.log('new-answer-created')
        var peer = null;

        if (remoteScreenSharing) {
            peer = mapPeers[peerUsername + ' Screen'][0];
        } else if (localScreenSharing) {
            peer = mapScreenPeers[peerUsername][0];
        } else {
            peer = mapPeers[peerUsername][0];
        }

        var answer = parsedData['message']['sdp'];

        console.log('mapPeers:');
        for (key in mapPeers) {
            console.log(key, ': ', mapPeers[key]);
        }

        console.log('peer: ', peer);
        console.log('answer: ', answer);


        peer.setRemoteDescription(answer);

        return;
    }

}

btnJoin.addEventListener('click', () => {
    username = usernameInput.value;

    console.log("username : ", username);

    if (username == '') {
        return;
    }

    usernameInput.value = '';
    usernameInput.disabled = true;
    usernameInput.style.visibility = 'hidden';

    btnJoin.disabled = true;
    btnJoin.style.visibility = 'hidden';

    var labelUsername = document.querySelector('#label-username');
    labelUsername.innerHTML = username;



    webSocket = new WebSocket(endPoint);

    webSocket.addEventListener("open", (e) => {
        console.log("connection open");

        sendSignal('new-peer', {
            'local_screen_sharing': false,
        });

    });

    webSocket.addEventListener("message", webSocketOnMessage);

    webSocket.addEventListener("close", (e) => {
        console.log("connection close");
    });
    var answer = parsedData['message']['sdp'];

    webSocket.addEventListener("error", (e) => {
        console.log("error found");
    });

});

var localStream = new MediaStream();
var localDisplayStream = new MediaStream();

const constraints = {
    'video': true,
    'audio': true
};


const localVideo = document.querySelector('#local-video');

const btnToggleAudio = document.querySelector('#btn-toggle-audio');
const btnToggleVideo = document.querySelector('#btn-toggle-video');

var btnRecordScreen = document.querySelector('#btn-record-screen');
var recorder;
var recording = false;



var userMedia = navigator.mediaDevices.getUserMedia(constraints)
    .then(stream => {
        localStream = stream;
        localVideo.srcObject = localStream;
        localVideo.muted = true;

        window.stream = stream;

        var audioTracks = stream.getAudioTracks();
        var videoTracks = stream.getVideoTracks();

        audioTracks[0].enabled = true;
        videoTracks[0].enabled = true;

        btnToggleAudio.addEventListener('click', () => {
            audioTracks[0].enabled = !audioTracks[0].enabled;

            if (audioTracks[0].enabled) {
                btnToggleAudio.innerHTML = 'Audio Mute';

                return;
            }

            btnToggleAudio.innerHTML = 'Audio Unmute';
        });

        btnToggleVideo.addEventListener('click', () => {
            videoTracks[0].enabled = !videoTracks[0].enabled;

            if (videoTracks[0].enabled) {
                btnToggleVideo.innerHTML = 'Video Off';

                return;
            }

            btnToggleVideo.innerHTML = 'Video On';
        });
    })
    .then(e => {
        btnShareScreen.onclick = event => {
            if (screenShared) {
                screenShared = !screenShared;

                localVideo.srcObject = localStream;
                btnShareScreen.innerHTML = 'Share screen';

                var localScreen = document.querySelector('#my-screen-video');
                removeVideo(localScreen);

                var screenPeers = getPeers(mapScreenPeers);
                for (index in screenPeers) {
                    screenPeers[index].close();
                }
                mapScreenPeers = {};

                return;
            }

            screenShared = !screenShared;

            navigator.mediaDevices.getDisplayMedia(constraints)
                .then(stream => {
                    localDisplayStream = stream;

                    var mediaTracks = stream.getTracks();
                    for (i = 0; i < mediaTracks.length; i++) {
                        console.log(mediaTracks[i]);
                    }

                    var localScreen = createVideo('my-screen');
                    // set to display stream
                    // if screen not shared
                    localScreen.srcObject = localDisplayStream;

                    // notify other peers
                    // of screen sharing peer
                    sendSignal('new-peer', {
                        'local_screen_sharing': true,
                    });
                })
                .catch(error => {
                    console.log('Error accessing display media.', error);
                });

            btnShareScreen.innerHTML = 'Stop sharing';
        }
    })
    .then(e => {
        btnRecordScreen.addEventListener('click', () => {
            if (recording) {
                // toggle recording
                recording = !recording;

                btnRecordScreen.innerHTML = 'Record Screen';

                recorder.stopRecording(function() {
                    var blob = recorder.getBlob();
                    invokeSaveAsDialog(blob);
                });

                return;
            }

            // toggle recording
            recording = !recording;

            navigator.mediaDevices.getDisplayMedia(constraints)
                .then(stream => {
                    recorder = RecordRTC(stream, {
                        type: 'video',
                        MimeType: 'video/webm'
                    });
                    recorder.startRecording();

                    var mediaTracks = stream.getTracks();
                    for (i = 0; i < mediaTracks.length; i++) {
                        console.log(mediaTracks[i]);
                    }

                })
                .catch(error => {
                    console.log('Error accessing display media.', error);
                });

            btnRecordScreen.innerHTML = 'Stop Recording';
        });
    })
    .catch(error => {
        console.log('error accessing media devices', error);
    })

var btnSendMsg = document.querySelector('#btn-send-msg');
var messageList = document.querySelector('#message-list');
var messageInput = document.querySelector('#msg');
btnSendMsg.addEventListener('click', sendMsgOnClick);

//this function send the message to the group
function sendMsgOnClick() {
    var message = messageInput.value;

    var li = document.createElement("li");
    li.appendChild(document.createTextNode("Me: " + message));
    messageList.appendChild(li);

    var dataChannels = getDataChannels();

    message = username + ': ' + message;

    for (index in dataChannels) {
        dataChannels[index].send(message);

    }
    messageInput.value = '';
}

//this function send the object to others
function sendSignal(action, message) {
    var jsonStr = JSON.stringify({
        'peer': username,
        'action': action,
        'message': message,
    });

    webSocket.send(jsonStr);
}

function createOfferer(peerUsername, localScreenSharing, remoteScreenSharing, receiver_channel_name) {
    var peer = new RTCPeerConnection(null);

    addLocalTracks(peer, localScreenSharing);

    var dc = peer.createDataChannel('channel');
    dc.addEventListener('open', () => {
        console.log('connection opened');
    });

    //dc.addEventListener('message', dcOnMessage);
    console.log('offer created');
    var remoteVideo = null;
    if (!localScreenSharing && !remoteScreenSharing) {
        dc.onmessage = dcOnMessage;

        remoteVideo = createVideo(peerUsername);
        setOnTrack(peer, remoteVideo);
        console.log('Remote video source: ', remoteVideo.srcObject);

        mapPeers[peerUsername] = [peer, dc];

        peer.addEventListener('iceconnectionstatechange', () => {
            var iceConnectionState = peer.iceConnectionState;

            if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed') {
                delete mapPeers[peerUsername];

                if (iceConnectionState != 'closed') {
                    peer.close();
                }

                removeVideo(remoteVideo);
            }
        });
    } else if (!localScreenSharing && remoteScreenSharing) {

        remoteVideo = createVideo(peerUsername + '-screen');
        setOnTrack(peer, remoteVideo);

        mapPeers[peerUsername + ' Screen'] = [peer, dc];

        peer.addEventListener('iceconnectionstatechange', () => {
            var iceConnectionState = peer.iceConnectionState;

            if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed') {
                delete mapPeers[peerUsername + ' Screen'];

                if (iceConnectionState != 'closed') {
                    peer.close();
                }

                removeVideo(remoteVideo);
            }
        });
    } else {
        mapScreenPeers[peerUsername] = [peer, dc];

        peer.addEventListener('iceconnectionstatechange', () => {
            var iceConnectionState = peer.iceConnectionState;

            if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed') {
                delete mapScreenPeers[peerUsername];

                if (iceConnectionState != 'closed') {
                    peer.close();
                }

                //removeVideo(remoteVideo);
            }
        });
    }

    peer.addEventListener('icecandidate', (event) => {
        if (event.candidate) {
            //console.log('new ice candidate: ', JSON.stringify(peer.localDescription));

            return;
        }

        sendSignal('new-offer', {
            'sdp': peer.localDescription,
            'receiver_channel_name': receiver_channel_name,
            'local_screen_sharing': localScreenSharing,
            'remote_screen_sharing': remoteScreenSharing,
        });
    });

    peer.createOffer()
        .then(o => peer.setLocalDescription(o))
        .then(() => {
            console.log('local descriptionset successful');
        });
}

function createAnswerer(offer, peerUsername, localScreenSharing, remoteScreenSharing, receiver_channel_name) {
    var peer = new RTCPeerConnection(null);

    addLocalTracks(peer, localScreenSharing);

    if (!localScreenSharing && !remoteScreenSharing) {
        var remoteVideo = createVideo(peerUsername);
        console.log('created');
        setOnTrack(peer, remoteVideo);

        peer.addEventListener('datachannel', e => {
            peer.dc = e.channel;
            peer.dc.onmessage = dcOnMessage;
            peer.dc.addEventListener('open', () => {
                console.log('connection opened 2');
            });

            //peer.dc.addEventListener('message', dcOnMessage);

            mapPeers[peerUsername] = [peer, peer.dc];

        });

        peer.addEventListener('iceconnectionstatechange', () => {
            var iceConnectionState = peer.iceConnectionState;

            if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed') {
                delete mapPeers[peerUsername];

                if (iceConnectionState != 'closed') {
                    peer.close();
                }

                removeVideo(remoteVideo);
            }
        });
    } else if (localScreenSharing && !remoteScreenSharing) {

        peer.addEventListener('datachannel', e => {
            peer.dc = e.channel;
            //peer.dc.onmessage = dcOnMessage;
            peer.dc.addEventListener('open', () => {
                console.log('connection opened 1');
            });

            //peer.dc.addEventListener('message', dcOnMessage);

            mapScreenPeers[peerUsername] = [peer, peer.dc];

        });

        peer.addEventListener('iceconnectionstatechange', () => {
            var iceConnectionState = peer.iceConnectionState;

            if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed') {
                delete mapScreenPeers[peerUsername];

                if (iceConnectionState != 'closed') {
                    peer.close();
                }

                //removeVideo(remoteVideo);
            }
        });
    } else {
        // offerer is sharing a screen

        var remoteVideo = createVideo(peerUsername + '-screen');
        console.log('explain -- ', remoteVideo);
        setOnTrack(peer, remoteVideo);

        peer.addEventListener('datachannel', e => {
            peer.dc = e.channel;
            //peer.dc.onmessage = dcOnMessage;
            peer.dc.addEventListener('open', () => {
                console.log('connection opened 3');
            });

            //peer.dc.addEventListener('message', dcOnMessage);

            mapPeers[peerUsername + ' Screen'] = [peer, peer.dc];

        });

        peer.addEventListener('iceconnectionstatechange', () => {
            var iceConnectionState = peer.iceConnectionState;

            if (iceConnectionState === 'failed' || iceConnectionState === 'disconnected' || iceConnectionState === 'closed') {
                delete mapPeers[peerUsername + ' Screen'];

                if (iceConnectionState != 'closed') {
                    peer.close();
                }

                removeVideo(remoteVideo);
            }
        });
    }

    peer.addEventListener('icecandidate', (event) => {
        if (event.candidate) {
            //console.log('new ice candidate: ', JSON.stringify(peer.localDescription));

            return;
        }

        sendSignal('new-answer', {
            'sdp': peer.localDescription,
            'receiver_channel_name': receiver_channel_name,
            'local_screen_sharing': localScreenSharing,
            'remote_screen_sharing': remoteScreenSharing,
        });
    });

    peer.setRemoteDescription(offer)
        .then(() => {
            console.log('remote description set successfully for %s.', peerUsername);

            return peer.createAnswer();
        })
        .then(a => {
            console.log('answer created');

            return peer.setLocalDescription(a);
        })

    return peer;
}

function addLocalTracks(peer, localScreenSharing) {
    if (!localScreenSharing) {
        localStream.getTracks().forEach(track => {
            console.log('adding localStream track.');
            peer.addTrack(track, localStream);
        });

        return;
    }

    localDisplayStream.getTracks().forEach(track => {
        console.log('Adding localDisplayStream track.');
        peer.addTrack(track, localDisplayStream);
    })

}


function dcOnMessage(event) {
    var message = event.data;

    var li = document.createElement('li');
    li.appendChild(document.createTextNode(message));
    messageList.appendChild(li);
}

function createVideo(peerUsername) {
    var videoContainer = document.querySelector('#video-container');

    var remoteVideo = document.createElement('video');

    remoteVideo.id = peerUsername + '-video';
    remoteVideo.autoplay = true;
    remoteVideo.playsinline = true;

    var videoWrapper = document.createElement('div');

    videoContainer.appendChild(videoWrapper);

    videoWrapper.appendChild(remoteVideo);

    return remoteVideo;
}

function setOnTrack(peer, remoteVideo) {
    console.log('Setting ontrack');
    var remoteStream = new MediaStream();

    remoteVideo.srcObject = remoteStream;

    console.log('remoteVideo: ', remoteVideo.id);

    peer.addEventListener('track', async(event) => {

        console.log('Adding track: ', event.track);
        remoteStream.addTrack(event.track, remoteStream);
    });
}

function removeVideo(video) {
    var videoWrapper = video.parentNode;

    videoWrapper.parentNode.removeChild(videoWrapper);
}

function getDataChannels() {
    var dataChannels = [];

    for (peerUsername in mapPeers) {
        console.log('mapPeers[', peerUsername, '] : ', mapPeers[peerUsername]);
        var dataChannel = mapPeers[peerUsername][1];
        console.log('dataChannel: ', dataChannel);
        dataChannels.push(dataChannel);
    }

    return dataChannels;
}

function getPeers(peerStorageObj) {
    var peers = [];

    for (peerUsername in peerStorageObj) {
        var peer = peerStorageObj[peerUsername][0];

        peers.push(peer);
    }

    return peers;
}

/*const btnToggleRecord = document.querySelector('#btn-toggle-record');
      btnToggleRecord.addEventListener('click', () =>{
         audioTracks[0].enabled = !audioTracks[0].enabled;

         if(audioTracks[0].enabled){
            btnToggleAudio.innerHTML = 'Audio Mute';

            return;
         }

         btnToggleAudio.innerHTML = 'Audio Unmute';
      });*/
/*const start = document.getElementById("Start");
const stop = document.getElementById("Stop");
const video = document.getElementById("Video");

var recorder, stream;

const stream = await navigator.mediaDevices.getDisplayMedia({
   video:{mediaSource:"screen"}
});

const recorder = new MediaRecorder(stream);

const chunks=[];
recorder.ondatavailable=e=>chunks.push(e.data);
recorder.start();

recorder.onstop=e=>{
   const completeBlob= new Blob(chunks,{type:chunks[0].type})
   video.scr=URL.createObjectURL(completeBlob)
};







let mediaRecorder;
let recordedBlobs;

//const codecPreferences = document.querySelector('#codecPreferences');

//const errorMsgElement = document.querySelector('span#errorMsg');
const recordedVideo = document.querySelector('video#recorded');
const recordButton = document.querySelector('button#record');
recordButton.addEventListener('click', () => {
   if (recordButton.textContent === 'Start Recording') {
     startRecording();
   } else {
     stopRecording();
     recordButton.textContent = 'Start Recording';
     playButton.disabled = false;
     downloadButton.disabled = false;
     codecPreferences.disabled = false;
   }
 });

 const playButton = document.querySelector('button#play');
   playButton.addEventListener('click', () => {
  const mimeType = codecPreferences.options[codecPreferences.selectedIndex].value.split(';', 1)[0];
  const superBuffer = new Blob(recordedBlobs, {type: mimeType});
  recordedVideo.src = null;
  recordedVideo.srcObject = null;
  recordedVideo.src = window.URL.createObjectURL(superBuffer);
  recordedVideo.controls = true;
  recordedVideo.play();
});

const downloadButton = document.querySelector('button#download');
downloadButton.addEventListener('click', () => {
  const blob = new Blob(recordedBlobs, {type: 'video/webm'});
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = 'test.webm';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
});

function handleDataAvailable(event) {
   console.log('handleDataAvailable', event);
   if (event.data && event.data.size > 0) {
     recordedBlobs.push(event.data);
   }
 }


function startRecording() {
   recordedBlobs = [];
   const mimeType = codecPreferences.options[codecPreferences.selectedIndex].value;
   const options = {mimeType};
 
   try {
     mediaRecorder = new MediaRecorder(window.stream, options);
   } catch (e) {
     console.error('Exception while creating MediaRecorder:', e);
     errorMsgElement.innerHTML = `Exception while creating MediaRecorder: ${JSON.stringify(e)}`;
     return;
   }

   console.log('Created MediaRecorder', mediaRecorder, 'with options', options);
  recordButton.textContent = 'Stop Recording';
  playButton.disabled = true;
  downloadButton.disabled = true;
  codecPreferences.disabled = true;
  mediaRecorder.onstop = (event) => {
    console.log('Recorder stopped: ', event);
    console.log('Recorded Blobs: ', recordedBlobs);
  };
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.start();
  console.log('MediaRecorder started', mediaRecorder);
}

function stopRecording() {
   mediaRecorder.stop();
 }

 function handleSuccess(stream) {
   recordButton.disabled = false;
   console.log('getUserMedia() got stream:', stream);
   window.stream = stream;
 
   const gumVideo = document.querySelector('video#gum');
   gumVideo.srcObject = stream;

   getSupportedMimeTypes().forEach(mimeType => {
      const option = document.createElement('option');
      option.value = mimeType;
      option.innerText = option.value;
      codecPreferences.appendChild(option);
    });
    codecPreferences.disabled = false;
   }
   async function init(constraints) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        handleSuccess(stream);
      } catch (e) {
        console.error('navigator.getUserMedia error:', e);
        errorMsgElement.innerHTML = `navigator.getUserMedia error:${e.toString()}`;
      }
    }
    
    document.querySelector('#btn-toggle-video').addEventListener('click', async () => {
      document.querySelector('#btn-toggle-video').disabled = false;
      const hasEchoCancellation = document.querySelector('#echoCancellation').checked;
      const constraints = {
        audio: {
          echoCancellation: {exact: hasEchoCancellation}
        },
        video: {
          width: 1280, height: 720
        }
      };
      console.log('Using media constraints:', constraints);
      await init(constraints);
    });
   

 */
