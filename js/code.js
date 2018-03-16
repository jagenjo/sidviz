var canvas = document.querySelector("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
var ctx = canvas.getContext("2d");
//jsSID.ReSID.const.RINGSIZE = 1024 * 4;
var player = null;
var settings = { 
	quality: jsSID.quality.best, //low,medium,best
	method: jsSID.ReSID.sampling_method.SAMPLE_FAST, //SAMPLE_FAST, SAMPLE_RESAMPLE_FAST, SAMPLE_INTERPOLATE, SAMPLE_RESAMPLE_INTERPOLATE
	clock: jsSID.chip.model.MOS6581, //MOS8580
	model: jsSID.chip.clock.PAL //NTSC
};

var sidrender = new SIDRender( canvas );
sidrender.onEvent = function(action,param, e)
{
	if(action == "playsong")
		loadSong(param);
}

var sids = [
	"data/terracresta.sid",
	"data/Mr_Marvellous.dmp",
	"data/Parallax (subtune 1).sid",
	"http://remix.kwed.org/sid.php/4886/Ocean_Loader_1%20(subtune%201).sid",
	"http://remix.kwed.org/sid.php/5497/Monty_on_the_Run%20(subtune%201).sid",
	"http://remix.kwed.org/sid.php/5285/DeathWish_III%20(subtune%201).sid",
	"http://remix.kwed.org/sid.php/812/Parallax%20(subtune%204).sid",
	"http://remix.kwed.org/sid.php/5578/Panther%20(subtune%201).sid",
	"http://remix.kwed.org/sid.php/5582/Spy_vs_Spy%20(subtune%201).sid"
];
sidrender.setPlaylist(sids);

var url = sids[0];

loadSong( url );

//render
function loop()
{
	requestAnimationFrame( loop );
	if(player && 1)
		sidrender.render( player.synth, player );
}

loop();


// audio
function loadSong( url, filename )
{
	if(url.substr(0,5) == "http:" || url.substr(0,6) == "https:")
		url = "http://" + location.host + "/proxy.php?url=" + url;

	if(!filename)
		filename = url;

	var ext = getExtension( filename );

	if( ext == "sid" )
	{
		player = new jsSID.SIDPlayer(settings);
		Stream.loadRemoteFile( url ,  function(data) {
			player.loadFileFromData(data);
			player.play();
		});
	}
	else if( ext == "dmp" )
	{
		player = new jsSID.DMPPlayer(settings);
		Stream.loadRemoteFile(url,  function(data) {
			player.loadFileFromData(data);
			player.play();
		});
	}
	else
		console.error("unknown format, only sid and dmp supported");
	if(player && settings.method)
		player.synth.sampling = settings.method;

}

// DRAG FILES

// Optional.   Show the copy icon when dragging over.  Seems to only work for chrome.
document.addEventListener('dragover', function(e) {
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
});

// Get file data on drop
document.addEventListener('drop', function(e) {
    e.stopPropagation();
    e.preventDefault();
    var files = e.dataTransfer.files; // Array of all files
    if(files.length)
	{
		var url = URL.createObjectURL(files[0]);
		loadSong( url, files[0].name );
    }

	var url = e.dataTransfer.getData("text/uri-list");
	if(url)
		loadSong( url );
});

function getExtension( url )
{
	var index = url.lastIndexOf(".");
	if(index != -1)
		return url.substr(index+1).toLowerCase();
	return "";
}


//MIDI

var midi = new MIDIInterface(function(){
	this.openInputPort( 0, on_midi_message );
})

function CONTROL( gate, waveform, ring )
{
	var control = gate ? 0x1 : 0x0; //gate
	if(waveform)
		control |= (waveform << 4) & 0xF0; //waveform
	if(ring)
		control |= 0x04; //ring mod
	return control;
}

var pitch = 0;
var bending = 0;
var delay = 200;

function on_midi_message(e,m)
{
	console.log(m);
	var synth = player.synth;

	var waveform = 0x4;
	var waveform2 = 0x1;

	if( m.cmd == MIDIEvent.NOTEON)
	{
		//gate, waveform, ring
		//var control = CONTROL( false, waveform, false );
		//synth.poke( 0x04, control, true); 
		var control = CONTROL( true, waveform, false );
		synth.poke( 0x04, control, true); 

		//freq
		pitch = m.getPitch() * 4;
		var freq = (pitch + bending)|0;
		synth.poke( 0x0, freq & 0x00FF, true); //FC LOW
		synth.poke( 0x1, (freq>>8) & 0x00FF, true); //FC HIGH

		var control = CONTROL( true, waveform2, false );
		synth.poke( 0x0b, control, true); 

		//freq
		pitch = m.getPitch() * 4;
		var freq = (pitch + bending)|0;
		synth.poke( 0x7, freq & 0x00FF, true); //FC LOW
		synth.poke( 0x8, (freq>>8) & 0x00FF, true); //FC HIGH
	}
	else if( m.cmd == MIDIEvent.NOTEOFF)
	{
		var control = CONTROL( false, waveform, false );
		synth.poke( 0x4, control, true); //control

		var control = CONTROL( false, waveform2, false );
		synth.poke( 0xb, control, true); //control
	}
	else if( m.cmd == MIDIEvent.CONTROLLERCHANGE)
	{
		if( m.data[1] == 1 ) //FILTER FC
		{
			var fc = m.data[2] * 300;
			synth.poke( 0x15, fc & 0x00FF, true); //FC LOW
			synth.poke( 0x16, (fc>>8) & 0x00FF, true); //FC HIGH
		}
		else if( m.data[1] == 5 ) //PW
		{
			var pw = m.data[2] * 16;
			synth.poke( 0x2, pw & 0x00FF, true); //PW LOW
			synth.poke( 0x3, (pw>>8) & 0x00FF, true); //PW HIGH
		}
	}
	else if( m.cmd == MIDIEvent.PITCHBEND)
	{
		bending = m.getPitchBend() * (1/12);
		var freq = (pitch + bending)|0;
		synth.poke( 0x0, freq & 0x00FF, true); //FC LOW
		synth.poke( 0x1, (freq>>8) & 0x00FF, true); //FC HIGH
	}
}