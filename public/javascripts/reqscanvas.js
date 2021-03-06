/**
 *   Nodestalgia websocket & canvas experiment
 *   2012 fcsonline
 */
(function(){

 var PI_2        = Math.PI * 2;
 var MAX_MSG_TTL = 50;
 var MARGIN_LEFT = 150;

 var canvasW     = 1000;
 var canvasH     = 560;
 var friction    = 0.99;
 var requests    = [];
 var typerequests= {};
 var messages    = [];
 var slots       = [];
 var total       = 0;

 var canvas;
 var ctx;
 var canvasDiv;

 var longDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
 var longMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

 var intervalId = null;
 var intervalLoopTime = 30;

 var speedX = 0;
 var speedY = 0;
 var sumarize = true;
 var colorize = true;
 var time = true;

 function init(){
   $canvas = $("#mainCanvas");
   canvas = $canvas[0];

   // Load dynamic properties
   intervalLoopTime = $canvas.data("frame-rate");
   speedX           = $canvas.data("speed-x");
   speedY           = $canvas.data("speed-y");
   colorize         = $canvas.data("colorize");
   sumarize         = $canvas.data("sumarize");
   time             = $canvas.data("time");

   if ( canvas.getContext ){
     setup();
     resetcounters();
     intervalId = setInterval( run , intervalLoopTime );
   }
   else{
     alert("Sorry, needs a recent version of Chrome, Firefox, Opera, Safari, or Internet Explorer 9.");
   }
 }

 function setup(){
   canvasDiv = $("#canvasContainer")[0];

   canvasW = canvasDiv.offsetWidth;
   canvasH = canvasDiv.offsetHeight;

   canvas.setAttribute("width", canvasW);
   canvas.setAttribute("height", canvasH);

   console.log ("Initialized canvas with size: " + canvasW + "x" + canvasH);
   console.log ("Initialized " + Math.floor(canvasH/20) + " vertical slots");

   ctx = canvas.getContext("2d");
 }

 function resetcounters(){
   // Init label display responses
   typerequests['200'] = 0;
   typerequests['404'] = 0;
   typerequests['304'] = 0;
 }

 function run(){
   ctx.globalCompositeOperation = "source-over";
   ctx.fillStyle = "rgba(8,8,12,0.65)";
   ctx.fillStyle = "rgb(0,0,0)";
   ctx.fillRect( 0 , 0 , canvasW , canvasH );
   ctx.globalCompositeOperation = "lighter";

   var Mrnd = Math.random;
   var Mabs = Math.abs;

   // Obsolete arrays
   var orequests = [];
   var omessages = [];

   var i = requests.length;
   while ( i-- ){
     var m  = requests[i];
     var x  = m.x;
     var y  = m.y;
     var vX = m.vX;
     var vY = m.vY;

     var avgVX = Mabs( vX );
     var avgVY = Mabs( vY );
     var avgV  = ( avgVX + avgVY ) * 0.5;

     if( avgVX < .1 ) vX *= Mrnd() * 3;
     if( avgVY < .1 ) vY *= Mrnd() * 3;

     var sc = avgV * 0.45;
     sc = Math.max( Math.min( sc , 4.5 ) , 0.4 );

     sc = m.size;

     var nextX = x + vX;
     var nextY = y + vY;

     if ( nextX > canvasW ){
       nextX = canvasW;
       vX *= -1;

       // Push a new message
       var msg = new Message();
       msg.x   = nextX - 50;
       msg.y   = nextY;
       msg.color = m.color;
       msg.text  = m.req.result;
       msg.ttl = MAX_MSG_TTL; // Aprox: 1.5s
       messages.push(msg);

       var g = ctx.createRadialGradient(nextX,nextY,m.size,nextX,nextY,m.size*20);
       g.addColorStop(0,"rgba(" + m.color.r + "," + m.color.g + "," + m.color.b + "," + 1 +")");
       g.addColorStop(0.2,"rgba(" + m.color.r + "," + m.color.g + "," + m.color.b + ", 0.4)");
       g.addColorStop(1.0,"rgba(255,255,255,0)");

       ctx.save();
       ctx.fillStyle = g;
       //ctx.fillStyle = colorDef(m.color);
       //ctx.scale(1, 0.75); // Elipse
       ctx.beginPath();
       ctx.arc(nextX, nextY, sc*20, 0, PI_2, false);
       ctx.fill();
       ctx.restore();

     } else if ( nextX < MARGIN_LEFT ){
       orequests.push(i);
     }

     if ( nextY > canvasH ){
       nextY = canvasH;
       vY *= -1;
     } else if ( nextY < 0 ){
       nextY = 0;
       vY *= -1;
     }

     m.vX = vX;
     m.vY = vY;
     m.x  = nextX;
     m.y  = nextY;

     // Reset shadows
     ctx.shadowBlur = 0;

     ctx.fillStyle = colorDef(m.color);
     ctx.beginPath();
     ctx.arc( nextX , nextY , sc , 0 , PI_2 , true );
     ctx.closePath();
     ctx.fill();


     ctx.save();
     ctx.font = "9pt Arial";
     ctx.shadowColor = "#fff";
     ctx.shadowOffsetX = 0;
     ctx.shadowOffsetY = 0;
     ctx.shadowBlur = 0;
     ctx.fillStyle = "#ffffff";
     //ctx.fillText(st, x, y);
     //ctx.fillStyle = "#fff";
     ctx.fillText(m.req.ip, 10, y);
     ctx.restore();
   }

   // HTTP Result labels
   var j = messages.length;
   ctx.font = "9pt Arial";
   ctx.shadowColor = "#fff";
   ctx.shadowOffsetX = 0;
   ctx.shadowOffsetY = 0;

   while ( j-- ){
     var msg  = messages[j];

     if (--msg.ttl > 0){
        ctx.fillStyle = colorDef(msg.color, msg.ttl / MAX_MSG_TTL);
        ctx.shadowBlur = msg.ttl / 5;
        ctx.fillText(msg.text, msg.x, msg.y);
     } else {
       omessages.push(j);
     }

   }

   // Type requests and total label
   if (sumarize) {
     var st = '';

     st += ' HTTP OK: ' + pad(typerequests['200'], 7);
     st += ' HTTP NOT FOUND: ' + pad(typerequests['404'], 5);
     st += ' HTTP NOT MODIFIED: ' + pad(typerequests['304'], 5);
     st += ' TOTAL: ' + pad(total, 8);

     var x = canvasW - 600;
     var y = canvasH - 5;
     ctx.font = "10pt Arial";
     ctx.shadowBlur = 0;
     ctx.fillStyle = "#ffffff";
     ctx.fillText(st, x, y);
   }

   // Date & Time display
   if (time) {
     var date = new Date();
     ctx.font = "10pt Arial";
     ctx.shadowBlur = 0;
     ctx.fillStyle = "#ffffff";
     ctx.fillText(getDateDisplay(date), 5, 15);
     ctx.fillText(getTimeDisplay(date), 5, 35);
   }

   // Remove obsolete requests & messages
   requests = $.grep(requests, function(n, i){
      return $.inArray(i, orequests);
   });

   messages = $.grep(messages, function(n, i){
      return $.inArray(i, omessages);
   });

 }

 function RemoteRequest(){
   this.color = {r: Math.floor( Math.random()*155 + 100 ), g: Math.floor( Math.random()*155 + 100 ), b: Math.floor( Math.random()*155 + 100 )};
   this.x     = 0;
   this.y     = 0;
   this.vX    = 0;
   this.vY    = 0;
   this.size  = 5;
   this.req   = null; // Filled by websocket
 }

 function Slot(){
   this.x     = 0;
   this.y     = 0;
   this.count = 5;
   this.ip    = '';
 }

 function colorDef(obj, alpha){
    if (alpha !== undefined) {
      return "rgba(" + obj.r  + "," + obj.g + "," + obj.b + "," + alpha + ")";
    } else {
      return "rgb(" + obj.r  + "," + obj.g + "," + obj.b + ")";
    }
  }

 function Message(){
   this.x     = 0;
   this.y     = 0;
   this.text  = "";
 }

 function rect( context , x , y , w , h ){
   context.beginPath();
   context.rect( x , y , w , h );
   context.closePath();
   context.fill();
 }

 function pad(num, length) {
   var str = '' + num;
   while (str.length < length) {
     str = '0' + str;
   }

   return str;
 }

 function getDateDisplay(date) {
   return longDays[date.getDay()] + ', ' + longMonths[date.getMonth()] + ' ' + date.getDate() + ', ' + date.getFullYear() + '\r\n';
 }

 function getTimeDisplay(date) {
   return (date.getHours() < 10 ? '0' : '') + date.getHours() + ':' +
            (date.getMinutes() < 10 ? '0' : '') + date.getMinutes() + ':' +
            (date.getSeconds() < 10 ? '0' : '') + date.getSeconds();
 }

 function findSlotByIp (ip) {
   for (var j = 0; j < slots.length; j++) {
      if (ip === slots[j].ip) {
        return j;
      }
   }

   return -1;
 }

 window.onload = init;

 // Establish the websocket connection
 var socket = io.connect('localhost', {port:8081});
 socket.on('log', function (data) {
     var robj = JSON.parse(data);
     // console.log(robj);

     if (typerequests[robj.result] === undefined) {
       typerequests[robj.result] = 0;
     }

     typerequests[robj.result]++;

     // if not paused, then add it to buffer
     if (intervalId) {
       var i = requests.length;
       var m = new RemoteRequest();
       m.x   = MARGIN_LEFT; // canvasW * 0.5;
       // m.y   = Math.floor( Math.random() * (canvasH - 100) + 50 ); // canvasH * 0.5;
       m.vX  = Math.random() * (speedX * 0.25) + speedX;
       m.vY  = 0; //Math.sin(i) * Math.random() * 34;
       m.req = robj;
       requests.push(m);

       // Search a slot
       var slotpos = findSlotByIp(robj.ip);

       if (slotpos < 0) {
         // New slot assignment
          var slot = new Slot();
          slot.ip = robj.ip;
          slot.y  = Math.floor( Math.random() * (canvasH - 100) + 50 ); // TODO: Find a correct slot vertical position
          slots.push(slot);
          console.log('New slot at: ' +slot.y);
       } else {
          slots[slotpos].count++;
          m.y = slots[slotpos].y;
          console.log('Recicled slot at: ' + slots[slotpos].y);
       }

     }

     ++total;
 });

// Pause
$(document).bind('keypress', function(e){
  var unicode=e.keyCode? e.keyCode : e.charCode;

  if (unicode == 32) { // Space - Pause
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    } else {
      intervalId = setInterval( run , intervalLoopTime );
    }
  } else if (unicode == 43){ // + more horizontal speed
    speedX = Math.min(speedX + 5, 200);
    console.log ("Speed X set to: " + speedX);
  } else if (unicode == 45){ // - less horizontal speed
    speedX = Math.max(speedX - 5, 10);
    console.log ("Speed X set to: " + speedX);
  }
});

// Resize window event
$(window).resize(function() {
  setup();
});

})();
