var data, labels;
var layer_defs, net, trainer;

// create neural net
var t = "layer_defs = [];\n\
layer_defs.push({type:'input', out_sx:1, out_sy:1, out_depth:2}); // 2 inputs: x, y \n\
layer_defs.push({type:'fc', num_neurons:20, activation:'relu'});\n\
layer_defs.push({type:'fc', num_neurons:20, activation:'relu'});\n\
layer_defs.push({type:'fc', num_neurons:20, activation:'relu'});\n\
layer_defs.push({type:'fc', num_neurons:20, activation:'relu'});\n\
layer_defs.push({type:'fc', num_neurons:20, activation:'relu'});\n\
layer_defs.push({type:'fc', num_neurons:20, activation:'relu'});\n\
layer_defs.push({type:'fc', num_neurons:20, activation:'relu'});\n\
layer_defs.push({type:'regression', num_neurons:3}); // 3 outputs: r,g,b \n\
\n\
net = new convnetjs.Net();\n\
net.makeLayers(layer_defs);\n\
\n\
trainer = new convnetjs.SGDTrainer(net, {learning_rate:0.01, momentum:0.9, batch_size:5, l2_decay:0.0});\n\
";

var batches_per_iteration = 100;
var mod_skip_draw = 100;
var smooth_loss = -1;

//Use origin Image to train net 
function update(){
  // forward prop the data
  var W = nn_canvas.width;
  var H = nn_canvas.height;

  var p = oridata.data;// Original Color Data

  var v = new convnetjs.Vol(1,1,2);  //Input: out_sx:1, out_sy:1, out_depth:2
  var loss = 0;
  var lossi = 0;
  var N = batches_per_iteration;
  //Train Net for bach random coordinate and pixel color
  for(var iters=0;iters<trainer.batch_size;iters++) {
    for(var i=0;i<N;i++) {
      // sample a coordinate
      var x = convnetjs.randi(0, W);//Get Random Coordinate for Trainning
      var y = convnetjs.randi(0, H);
      var ix = ((W*y)+x)*4; //Start color data index 
      var r = [p[ix]/255.0, p[ix+1]/255.0, p[ix+2]/255.0]; //Output: Color of original image  ( r g b value 0~1 )
      v.w[0] = (x-W/2)/W; //Get Coordinate x -0.5~0.5
      v.w[1] = (y-H/2)/H; //Get Coordinate y -0.5~0.5
      var stats = trainer.train(v, r); //Train net by Coordinate(Input) & Color(Output)
      loss += stats.loss; //Add Loss of pixel
      lossi += 1; //Increase learning count
    }
  }
  loss /= lossi; //Get Final loss

  if(counter === 0) smooth_loss = loss; //First tick, assign loss to smooth_loss
  else smooth_loss = 0.99*smooth_loss + 0.01*loss; //Next Tick, add 1% effect to smooth_loss based on current loss

  var t = '';
  t += 'loss: ' + smooth_loss;
  t += '<br>'
  t += 'iteration: ' + counter;
  $("#report").html(t); //Display current loss & iteration
}

//Draw target image
function draw() {
  if(counter % mod_skip_draw !== 0) return;

  // iterate over all pixels in the target array, evaluate them
  // and draw
  var W = nn_canvas.width;
  var H = nn_canvas.height;

  var g = nn_ctx.getImageData(0, 0, W, H);
  var v = new convnetjs.Vol(1, 1, 2); //Input: out_sx:1, out_sy:1, out_depth:2
  //Forward Net for each coordinate to get full image
  for(var x=0;x<W;x++) { //Loop for each x coordinate
    v.w[0] = (x-W/2)/W;
    for(var y=0;y<H;y++) { //Loop for each y coordinate
      v.w[1] = (y-H/2)/H;
      var ix = ((W*y)+x)*4; // Start color data index 
      var r = net.forward(v); //Input coordinate and get forward color output 
      g.data[ix+0] = Math.floor(255*r.w[0]); //Red
      g.data[ix+1] = Math.floor(255*r.w[1]); //Green
      g.data[ix+2] = Math.floor(255*r.w[2]); //Blue
      g.data[ix+3] = 255; // alpha...
    }
  }
    //Draw bezier path on Logo Creation Canvasv
    //var pathSVG = new Path2D("M0 0 C");

  lo_ctx.fillStyle = "Write";
  lo_ctx.fillRect(0,0,W,H);
  lo_ctx.fillStyle = "Green";
  lo_ctx.strokeStyle = "Black";
  lo_ctx.beginPath();
  v.w[0] = convnetjs.randi(0, W) / W - 0.5;
  v.w[1] = convnetjs.randi(0, H) / H - 0.5;
  var lo_forward = net.forward(v);
  var lastX = (lo_forward.w[0] + lo_forward.w[2]) / 2 * W;
  var lastY = (lo_forward.w[1] + lo_forward.w[2]) / 2 * H;
  lo_ctx.moveTo(lastX, lastY);
  var lo_forward2;
  var lo_loop = convnetjs.randi(0, 20);
  for (var index_curve = 0; index_curve < lo_loop + 1 ; index_curve++) {
      var x = convnetjs.randi(0, W);
      var y = convnetjs.randi(0, H);
      v.w[0] = x / W - 0.5;
      v.w[1] = y / H - 0.5;
      lo_forward = net.forward(v);
      x = convnetjs.randi(0, W);
      y = convnetjs.randi(0, H);
      v.w[0] = x / W - 0.5;
      v.w[1] = x / W - 0.5;
      lo_forward2 = net.forward(v);
      lo_ctx.bezierCurveTo(lastX, lastY, lo_forward.w[2] * W, lo_forward2.w[0] * H, lo_forward2.w[1] * W, lo_forward2.w[2] * H);
      lastX = lo_forward2.w[1] * W;
      lastY = lo_forward2.w[2] * H;
  }
  lo_ctx.closePath();
  lo_ctx.fill();
  lo_ctx.stroke();

  nn_ctx.putImageData(g, 0, 0); //Put Target Image data
}

//Tick to train and draw
function tick() {
  update();
  draw();
  counter += 1; //Increase Tick Count
}

//Reload Net
function reload() {
  counter = 0;
  eval($("#layerdef").val());//Init layer_defs textarea
  //$("#slider").slider("value", Math.log(trainer.learning_rate) / Math.LN10);
  //$("#lr").html('Learning rate: ' + trainer.learning_rate);
}

//Switch learning rate
function refreshSwatch() {
  var lr = $("#slider").slider("value");
  trainer.learning_rate = Math.pow(10, lr);
  $("#lr").html('Learning rate: ' + trainer.learning_rate);
}

var ori_canvas, nn_canvas, lo_canvas, ori_ctx, nn_ctx, lo_ctx, oridata;
var sz = 200; // size of our drawing area
var counter = 0;
//Function definitions
$(function() {
    // dynamically load lena image into original image canvas
    var image = new Image();
    //image.src = "lena.png";
    
    //Load canvas & set original pics & Start Timmer
    image.onload = function() {

      ori_canvas = document.getElementById('canv_original');
      nn_canvas = document.getElementById('canv_net');
      lo_canvas = document.getElementById('canv_creation');
      ori_canvas.width = sz;
      ori_canvas.height = sz;
      nn_canvas.width = sz;
      nn_canvas.height = sz;
      lo_canvas.width = sz;
      lo_canvas.height = sz;

      ori_ctx = ori_canvas.getContext("2d");
      nn_ctx = nn_canvas.getContext("2d");
      lo_ctx = lo_canvas.getContext("2d");
      ori_ctx.drawImage(image, 0, 0, sz, sz);
      oridata = ori_ctx.getImageData(0, 0, sz, sz); // grab the data pointer. Our dataset.

      // start the regression!
      setInterval(tick, 1); //Tick per 1 ms
    }
    image.src = "imgs/cat.jpg";

    // init put text into textarea
    $("#layerdef").val(t);

    // load the net
    reload();

    // set up slider for learning rate
    $("#slider").slider({
      orientation: "horizontal",
      min: -4,
      max: -1,
      step: 0.05,
      value: Math.log(trainer.learning_rate) / Math.LN10,
      slide: refreshSwatch,
      change: refreshSwatch
    });
    $("#lr").html('Learning rate: ' + trainer.learning_rate);
    
    //Pick a new file as origin image
    $("#f").on('change', function(ev) {
      var f = ev.target.files[0];
      var fr = new FileReader();
      fr.onload = function(ev2) {
        var image = new Image();
        image.onload = function(){
          ori_ctx.drawImage(image, 0, 0, sz, sz);
          oridata = ori_ctx.getImageData(0, 0, sz, sz);
          reload();
        }
        image.src = ev2.target.result;
      };
      fr.readAsDataURL(f);
    });
    
    //Choose a new origin image from gallery
    $('.ci').click(function(){
      var src = $(this).attr('src');
      ori_ctx.drawImage(this, 0, 0, sz, sz);
      oridata = ori_ctx.getImageData(0, 0, sz, sz);
      reload();
    });
});
