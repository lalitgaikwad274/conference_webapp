const btnCreate = document.querySelector("#btn-create");


const characters ='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

btnCreate.addEventListener('click', ()=>{
   let roomName = '';
    const charactersLength = characters.length;
    for ( let i = 0; i < 12; i++ ) {
        if(i==3 || i==7)
            roomName += '-';
        else
            roomName += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    console.log(roomName);    
    window.location.pathname = '/chat/'+ roomName + '/';

})

const btnJoin = document.querySelector('#btn-join');
var key;
btnJoin.addEventListener('click', ()=>{
    key = document.getElementById('Room_id').value;
    window.location.pathname = '/chat/'+ key + '/';
})
