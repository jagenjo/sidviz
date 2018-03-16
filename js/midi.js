(function( global )
{

function MIDIEvent( data )
{
	this.channel = 0;
	this.cmd = 0;

	if(data)
		this.setup(data)
	else
		this.data = [0,0,0];
}

MIDIEvent.prototype.setup = function( raw_data )
{
	this.data = raw_data;

	var midiStatus = raw_data[0];
	this.status = midiStatus;

	var midiCommand = midiStatus & 0xF0;

	if(midiStatus >= 0xF0)
		this.cmd = midiStatus;
	else
		this.cmd = midiCommand;

	if(this.cmd == MIDIEvent.NOTEON && this.velocity == 0)
		this.cmd = MIDIEvent.NOTEOFF;

	this.cmd_str = MIDIEvent.commands[ this.cmd ] || "";

	if ( midiCommand >= MIDIEvent.NOTEON || midiCommand <= MIDIEvent.NOTEOFF ) {
		this.channel =  midiStatus & 0x0F;
	}
}

Object.defineProperty( MIDIEvent.prototype, "velocity", {
	get: function() {
		if(this.cmd == MIDIEvent.NOTEON)
			return this.data[2];
		return -1;
	},
	set: function(v) {
		this.data[2] = v; //  v / 127;
	},
	enumerable: true
});

MIDIEvent.notes = ["A","A#","B","C","C#","D","D#","E","F","F#","G","G#"];

//returns HZs
MIDIEvent.prototype.getPitch = function()
{
	return Math.pow(2, (this.data[1] - 69) / 12 ) * 440;
}

MIDIEvent.computePitch = function( note )
{
	return Math.pow(2, (note - 69) / 12 ) * 440;
}


//not tested, there is a formula missing here
MIDIEvent.prototype.getPitchBend = function()
{
	return this.data[1] + (this.data[2] << 7) - 8192;
}

MIDIEvent.computePitchBend = function(v1,v2)
{
	return v1 + (v2 << 7) - 8192;
}

MIDIEvent.prototype.setCommandFromString = function( str )
{
	this.cmd = MIDIEvent.computeCommandFromString(str);
}

MIDIEvent.computeCommandFromString = function( str )
{
	if(!str)
		return 0;

	if(str && str.constructor === Number)
		return str;

	str = str.toUpperCase();
	switch( str )
	{
		case "NOTE ON":
		case "NOTEON": return MIDIEvent.NOTEON; break;
		case "NOTE OFF":
		case "NOTEOFF": return MIDIEvent.NOTEON; break;
		case "KEY PRESSURE": 
		case "KEYPRESSURE": return MIDIEvent.KEYPRESSURE; break;
		case "CONTROLLER CHANGE": 
		case "CONTROLLERCHANGE": 
		case "CC": return MIDIEvent.CONTROLLERCHANGE; break;
		case "PROGRAM CHANGE":
		case "PROGRAMCHANGE":
		case "PC": return MIDIEvent.PROGRAMCHANGE; break;
		case "CHANNEL PRESSURE":
		case "CHANNELPRESSURE": return MIDIEvent.CHANNELPRESSURE; break;
		case "PITCH BEND":
		case "PITCHBEND": return MIDIEvent.PITCHBEND; break;
		case "TIME TICK":
		case "TIMETICK": return MIDIEvent.TIMETICK; break;
		default: return Number(str); //asume its a hex code
	}
}

MIDIEvent.toNoteString = function(d)
{
	var note = d - 21;
	var octave = d - 24;
	note = note % 12;
	if(note < 0)
		note = 12 + note;
	return MIDIEvent.notes[ note ] + Math.floor(octave / 12 + 1);
}

MIDIEvent.prototype.toString = function()
{
	var str = "" + this.channel + ". " ;
	switch( this.cmd )
	{
		case MIDIEvent.NOTEON: str += "NOTEON " + MIDIEvent.toNoteString( this.data[1] ); break;
		case MIDIEvent.NOTEOFF: str += "NOTEOFF " + MIDIEvent.toNoteString( this.data[1] ); break;
		case MIDIEvent.CONTROLLERCHANGE: str += "CC " + this.data[1] + " " + this.data[2]; break;
		case MIDIEvent.PROGRAMCHANGE: str += "PC " + this.data[1]; break;
		case MIDIEvent.PITCHBEND: str += "PITCHBEND " + this.getPitchBend(); break;
		case MIDIEvent.KEYPRESSURE: str += "KEYPRESS " + this.data[1]; break;
	}

	return str;
}

MIDIEvent.prototype.toHexString = function()
{
	var str = "";
	for(var i = 0; i < this.data.length; i++)
		str += this.data[i].toString(16) + " ";
}

MIDIEvent.NOTEOFF = 0x80;
MIDIEvent.NOTEON = 0x90;
MIDIEvent.KEYPRESSURE = 0xA0;
MIDIEvent.CONTROLLERCHANGE = 0xB0;
MIDIEvent.PROGRAMCHANGE = 0xC0;
MIDIEvent.CHANNELPRESSURE = 0xD0;
MIDIEvent.PITCHBEND = 0xE0;
MIDIEvent.TIMETICK = 0xF8;

MIDIEvent.commands = {
	0x80: "note off",
	0x90: "note on",
	0xA0: "key pressure",
	0xB0: "controller change",
	0xC0: "program change",
	0xD0: "channel pressure",
	0xE0: "pitch bend",
	0xF0: "system",
	0xF2: "Song pos",
	0xF3: "Song select",
	0xF6: "Tune request",
	0xF8: "time tick",
	0xFA: "Start Song",
	0xFB: "Continue Song",
	0xFC: "Stop Song",
	0xFE: "Sensing",
	0xFF: "Reset"
}

//MIDI wrapper
function MIDIInterface( on_ready, on_error )
{
	if(!navigator.requestMIDIAccess)
	{
		this.error = "not suppoorted";
		if(on_error)
			on_error("Not supported");
		else
			console.error("MIDI NOT SUPPORTED, enable by chrome://flags");
		return;
	}

	this.on_ready = on_ready;

	navigator.requestMIDIAccess().then( this.onMIDISuccess.bind(this), this.onMIDIFailure.bind(this) );
}

MIDIInterface.MIDIEvent = MIDIEvent;

MIDIInterface.prototype.onMIDISuccess = function(midiAccess)
{
	console.log( "MIDI ready!" );
	console.log( midiAccess );
	this.midi = midiAccess;  // store in the global (in real usage, would probably keep in an object instance)
	this.updatePorts();

	if (this.on_ready)
		this.on_ready(this);
}

MIDIInterface.prototype.updatePorts = function()
{
	var midi = this.midi;
	this.input_ports = midi.inputs;
	var num = 0;
	for (var i = 0; i < this.input_ports.size; ++i) {
		  var input = this.input_ports.get(i);
			console.log( "Input port [type:'" + input.type + "'] id:'" + input.id +
		  "' manufacturer:'" + input.manufacturer + "' name:'" + input.name +
		  "' version:'" + input.version + "'" );
			num++;
	  }
	this.num_input_ports = num;


	num = 0;
	this.output_ports = midi.outputs;
	for (var i = 0; i < this.output_ports.size; ++i) {
		  var output = this.output_ports.get(i);
		console.log( "Output port [type:'" + output.type + "'] id:'" + output.id +
		  "' manufacturer:'" + output.manufacturer + "' name:'" + output.name +
		  "' version:'" + output.version + "'" );
			num++;
	  }
	this.num_output_ports = num;
}

MIDIInterface.prototype.onMIDIFailure = function(msg)
{
	console.error( "Failed to get MIDI access - " + msg );
}

MIDIInterface.prototype.openInputPort = function( port, callback)
{
	var input_port = this.input_ports.get( port );
	if(!input_port)
		return false;

	input_port.onmidimessage = function(a) {
		var midi_event = new MIDIEvent(a.data);
		if(callback)
			callback(a.data, midi_event );
		if(MIDIInterface.on_message)
			MIDIInterface.on_message( a.data, midi_event );
	}
	console.log("port open: ", input_port);
	return true;
}

MIDIInterface.parseMsg = function(data)
{

}

MIDIInterface.prototype.sendMIDI = function( port, midi_data )
{
	if( !midi_data )
		return;

	var output_port = this.output_ports.get(port);
	if(!output_port)
		return;

	if( midi_data.constructor === MIDIEvent)
		output_port.send( midi_data.data ); 
	else
		output_port.send( midi_data ); 
}

global.MIDIInterface = MIDIInterface;
global.MIDIEvent = MIDIEvent;

})(this);