function SIDRender( canvas )
{
	this.synth = null;
	this.player = null;

	this.canvas = canvas;
	this.ctx = canvas.getContext("2d");
	this.data = new WeakMap();

	this.triggers = [];

	this.bindEvents();
	//this.dragAndScale = new DragAndScale( canvas );

	this.icons = {};
	this.createIcons();

	this.playlist = {
		songs: [],
		visible: true,
		width: 300
	}

	this._last_mouse = [0,0];
}

SIDRender.prototype.render = function( synth, player )
{
	if(!synth)
		return;

	this.player = player;
	this.synth = synth;

	var canvas = this.canvas;
	var ctx = this.ctx;

	this.triggers.length = 0;
	ctx.globalAlpha = 1;
	ctx.imageSmoothingEnabled = false;
	ctx.clearRect( 0, 0, canvas.width, canvas.height );

	ctx.save();

	var x = 0;


	if(this.dragAndScale)
		this.dragAndScale.toCanvasContext( ctx );


	var w = 600;
	var h = canvas.height / 5;

	ctx.font = "12px Courier New";
	ctx.fillStyle = "black";
	ctx.fillRect( 0, 0, canvas.width, canvas.height );

	ctx.save();

	if(this.playlist.visible)
		x += this.playlist.width;

	this.renderButton( x + 5, 30,20, canvas.height * 0.8, this.playlist.visible ? "<" : ">", false, "playlist" );

	x += 40;

	if(player)
		this.renderPlayer( player, x + 10, 30, 250, 70 );

	if(synth.voice)
	{
		for(var j = 0; j < synth.voice.length; ++j)
			this.renderVoice( x + 10, 120 + (h+20) * j, w, h, synth.voice[j], j, synth.filter );
	}

	if(player.synth.sampling == jsSID.ReSID.sampling_method.SAMPLE_RESAMPLE_INTERPOLATE)
		this.renderSamples( x + 30, 120 + (h+20)*3, w*2, h, synth.sample, 10000, "#AEF" );

	this.renderFilter( synth.filter, x + 370, 30, 920, 70 );

	ctx.restore();

	if(this.playlist.visible)
		this.renderPlaylist();

	ctx.fillStyle = "white";
	ctx.textAlign = "center";
	ctx.fillText("SIDViz by tamat 2017 (using jsSID.js): drag any SID or DMP file or link to play it", canvas.width * 0.5, 20);

	if( this.over_trigger )
	{
		ctx.textAlign = "left";
		ctx.fillStyle = "gray";
		ctx.fillText( this.over_trigger[4], 10, 20);
	}

	ctx.restore();
}

SIDRender.prototype.renderPlaylist = function(x,y,w,h)
{
	//this.renderButton(10,30,40,20,"Close", player.ready, "playlist");
	ctx.fillStyle = "#AEF";

	var selected = -1;
	if( this.over_trigger && this.over_trigger[4] == "playsong")
		 selected = this.over_trigger[5];

	for(var i = 0; i < this.playlist.songs.length; ++i)
	{
		var song = this.playlist.songs[i];
		var index = song.lastIndexOf("/");
		var filename = decodeURIComponent( song.substr(index) );
		if(selected == song)
			ctx.fillStyle = "white";
		else
			ctx.fillStyle = "#AEF";
		ctx.fillText( filename, 10, 70 + i*16 );
		this.addTrigger( 10, 60 + i*16, this.playlist.width - 20, 16, "playsong", song );
	}
}


SIDRender.prototype.renderPlayer = function( player, x, y, w, h  )
{
	this.renderButton(x,y,40,20,"Play", player.ready, "play");
	this.renderButton(x+45,y,40,20,"Stop", !player.ready, "stop");
	if(player.prevTrack)
		this.renderButton(x+90,y,40,20,"Prev", false, "prev");
	if(player.nextTrack)
		this.renderButton(x+135,y,40,20,"Next", false, "next");

	this.renderButton(x+245,y,20,20,"", false, "lock", 0, "#A42");
	this.renderButton(x+275,y,40,20,"HQ", player.synth.sampling == jsSID.ReSID.sampling_method.SAMPLE_RESAMPLE_INTERPOLATE, "HQ");
	this.renderButton(x+275,y+24,40,20,"LIVE", player.synth.ignore_commands, "LIVE");

	var ctx = this.ctx;
	if( player.sidfile )
	{
		ctx.fillStyle = "#AFD";
		if( !player.sidfile.trimmed )
		{
			player.sidfile.author = trimString( player.sidfile.author );
			player.sidfile.name = trimString( player.sidfile.name );
			player.sidfile.published = trimString( player.sidfile.published );
			player.sidfile.trimmed = true;
		}

		ctx.fillText( player.sidfile.author , x, y + 35 );
		ctx.fillText( player.sidfile.name , x, y + 52 );
		ctx.fillText( player.sidfile.published , x, y + 70 );

		ctx.fillText( player.sidfile.currentsong + "/" + player.sidfile.subsongs, x + 190,y + 15 );

	}
}

SIDRender.prototype.renderFilter = function( filter, x, y, w, h  )
{
	var canvas = this.canvas;
	var ctx = this.ctx;

	x = x|0;
	y = y|0;
	w = w|0;
	h = h|0;

	var startx = x;

	var globalAlpha = 1;
	if(!filter.enabled)
		globalAlpha = 0.5;
	ctx.globalAlpha = globalAlpha;

	this.renderButton(x-12,y,10,10,"", filter.ignore_commands,"lock_filter",0, "#A42");

	ctx.fillStyle = "white";

	this.fillTextV( "Filter", x,y, 16, h, "white" );
	this.addTrigger(  x,y, 16, h, "global_filter", 0, true );

	x+= 20;

	var text = [];
	if(filter.filt !== undefined)
		text.push( "channels: " + SIDRender.getFilterString( filter.filt ));
	if(filter.fc !== undefined)
		text.push( "fc: " + filter.fc.toFixed(0) );
	if(filter.res !== undefined)
		text.push( "res: " + filter.res.toFixed(0) );
	if(filter.vol !== undefined)
		text.push( "vol: " + filter.vol.toFixed(0));
	if(filter.filt !== undefined)
		text.push( "filt: " + filter.filt.toString() );
	for(var i = 0; i < text.length; ++i )
		ctx.fillText( text[i], x, y + i*14 + 14 );


	x+=100;

	this.renderKnob( x, y, h,h, 0, 30, filter.vol, "filter_vol", "vol" );

	x+=h;

	var lp = filter.hp_bp_lp & 0x1;
	var bp = filter.hp_bp_lp & 0x2;
	var hp = filter.hp_bp_lp & 0x4;

	this.renderButton( x,y,30,16,"LP", lp, "filter_type", 0x1);
	this.renderButton( x,y+20,30,16,"BP", bp, "filter_type", 0x2);
	this.renderButton( x,y+40,30,16,"HP", hp, "filter_type", 0x4);

	var info = this.data.get( filter );
	if(!info)
	{
		info = {
			pos: 0,
			samples: new Float32Array(w)
		};
		this.data.set( filter, info );
	}

	if(info.samples.length != w)
		info.samples = new Float32Array(w);

	info.samples[ info.pos ] = filter.fc;
	info.pos += 1;
	info.pos = info.pos % info.samples.length;

	x += 30;

	this.renderKnob( x, y, h,h, 0, 1024, filter.fc, "filter_freq", "freq" );
	this.renderKnob( x + h, y, h,h, 0, 24, filter.res, "filter_res", "res" );

	x += h*2;

	var boxwidth = (startx + w) - x;
	this.renderSamples( x , y, boxwidth, h, info.samples, 1600, "#FE3", true, false );
	this.addTrigger(  x , y, boxwidth, h, "set_filter", [boxwidth,h], true );
	ctx.fillStyle = "#FFA";
	ctx.fillRect( Math.floor( x + boxwidth * ( info.pos / info.samples.length )), y, 1, h);

	ctx.globalAlpha = 1;
}

SIDRender.prototype.renderVoice = function( x,y, w,h, voice, num, filter )
{
	if(!voice)
		return;

	x = x|0;
	y = y|0;

	var ctx = this.ctx;
	var starty = y;

	var globalAlpha = 1;
	if(voice.muted)
		globalAlpha = 0.5;
	ctx.globalAlpha = globalAlpha;
	
	this.fillTextV( "voice" + num, x,y, 16, h);
	this.addTrigger(  x,y, 16, h, "mute_voice", num );

	x += 20;
	this.renderSamples( x,y,w,h, voice.sample, 50000 );

	if(filter.filt & 1<<num)
		ctx.globalAlpha = globalAlpha;
	else
		ctx.globalAlpha = globalAlpha * 0.5;
	this.fillTextV( "filter", x+w,y, 16, h, "#3FF");
	this.addTrigger( x+w,y, 16, h, "toggle_filter", num );
	ctx.globalAlpha = globalAlpha;

	var freq = voice.wave.freq;

	x += w + 50;

	ctx.fillStyle = "white";
	ctx.fillText( "freq: " + freq.toString(), x , 10 + y );
	ctx.fillText( "pw:   " + voice.wave.pw.toString(), x , 24 + y );
	ctx.fillText( "ring_mod:" + voice.wave.ring_mod.toString(), x , 38 + y );

	y += 44;

	//ctx.fillText( "wave: " + SIDRender.getWaveString( voice.wave.waveform ), x , 30 + y );

	this.renderButton(x-4,y,10,10,"", voice.wave.ignore_waveform,"lock_waveform",num, "#A42");

	ctx.globalAlpha = globalAlpha * (voice.wave.waveform & 0x1 ? 1 : 0.25);
	ctx.drawImage( this.icons.T, x + 10, y );
	this.addTrigger( x + 10, y, 64,20, "set_waveform", [num, 0x1]);

	ctx.globalAlpha = globalAlpha * (voice.wave.waveform & 0x4 ? 1 : 0.25);
	ctx.drawImage( this.icons.P, x + 10, y + 22 );
	this.addTrigger( x + 10, y + 22, 64,20, "set_waveform", [num, 0x4]);

	ctx.globalAlpha = globalAlpha * (voice.wave.waveform & 0x2 ? 1 : 0.25);
	ctx.drawImage( this.icons.S, x + 10, y + 44 );
	this.addTrigger( x + 10, y + 44, 64,20, "set_waveform", [num, 0x2]);

	ctx.globalAlpha = globalAlpha * (voice.wave.waveform & 0x8 ? 1 : 0.25);
	ctx.drawImage( this.icons.N, x + 10, y + 66 );
	this.addTrigger( x + 10, y + 66, 64,20, "set_waveform", [num, 0x8]);

	ctx.globalAlpha = globalAlpha;

	this.renderADSR( x, y + 93, 80, 30, voice.envelope );

	var num_samples = 256;

	var voice_info = this.data.get( voice );
	if(!voice_info)
	{
		voice_info = {
			pos: 0,
			samples: new Float32Array(num_samples)
		};
		this.data.set( voice, voice_info );
	}

	voice_info.samples[ voice_info.pos ] = freq;
	//voice_info.samples[ voice_info.pos ] = voice.envelope.gate ? freq : 0;
	voice_info.pos += 1;
	voice_info.pos = voice_info.pos % voice_info.samples.length;

	x += 100;

	this.renderSamples( x , starty, 512, h, voice_info.samples, 1024*16, "#FAF", true, "dots", voice_info.pos );
	//ctx.fillStyle = "#AEF";
	//ctx.fillRect( Math.floor( x + 512 * ( voice_info.pos / voice_info.samples.length )), y, 1, h);
}

SIDRender.prototype.renderButton = function( x,y, w,h, text, on, event, params, color )
{
	x = x|0;
	y = y|0;

	var ctx = this.ctx;
	ctx.save();

	color = color || "white";

	ctx.fillStyle = color;
	ctx.strokeStyle = color ;

	if(on)
		ctx.fillRect(x+0.5,y+0.5,w,h);
	else
		ctx.strokeRect(x+0.5,y+0.5,w,h);

	ctx.fillStyle = on ? "black" : color;
	ctx.textAlign = "center";
	ctx.fillText( text, x + w*0.5, y + h*0.5 + 4 );

	if(event)
		this.addTrigger(x,y,w,h, event, params);

	ctx.restore();
}

SIDRender.prototype.renderKnob = function( x,y, w,h, min, max, value, event, title )
{
	var ctx = this.ctx;
	ctx.fillStyle = "white";
	var r = h * 0.5 - 10;

	//ctx.strokeRect(x+0.5,y+0.5,w,h);

	ctx.save();
	ctx.textAlign = "center";


	if(title)
		ctx.fillText( title, x + w*0.5, y + h - 5 );

	ctx.translate( x + w*0.5, y + r );

	ctx.beginPath();
	ctx.arc(0,0, r, 0, Math.PI * 2 );
	ctx.fill();

	var v = Math.clamp( (value - min) / (max - min), 0,1);
	ctx.fillStyle = "black";
	ctx.rotate( -Math.PI * 0.75 + Math.PI * 1.5 * v );
	ctx.beginPath();
	ctx.arc(0, -r*0.8, r*0.1, 0, Math.PI * 2 );
	ctx.fill();

	ctx.restore();

	if(event)
		this.addTrigger(x,y,w,h,event,0,true);
}


SIDRender.prototype.renderSamples = function( x,y, w,h, samples, amplitude, line_color, nocenter, mode, offset )
{
	if(!samples)
		return;
	var ctx = this.ctx;

	var delta = samples.length / w;
	offset = offset || 0;

	ctx.lineWidth = 1;

	//border
	if(!nocenter)
	{
		ctx.strokeStyle = "green";
		ctx.beginPath();
		ctx.moveTo(x,y + h*0.5);
		ctx.lineTo(x+w,y + 0.5 + h*0.5);
		ctx.stroke();
	}

	var starty = y;
	var scaley = h * 0.5;
	var min = -1;

	if(nocenter)
	{
		min = 0;
		y += h;
		scaley = h;
	}
	else
		y += h * 0.5;

	var posx = 0;
	var l = samples.length;

	if(mode == "dots")
	{
		ctx.strokeStyle = line_color || "#AFA";
		ctx.beginPath();
		for(var i = 0; i < l; i+=delta)
		{
			var f = Math.clamp( samples[((i + offset)|0)%l] / amplitude, min, 1);
			var vy = Math.floor( scaley * -f + y ) + 0.5;
			ctx.moveTo( x + posx, vy );
			ctx.lineTo( x + posx + 1, vy );
			posx += 1;
		}
		ctx.stroke();

		/*
		for(var i = 0; i < samples.length; i+=delta)
		{
			var f = Math.clamp( samples[i|0] / amplitude, min, 1);
			if(f>min && f<1)
				ctx.fillRect( Math.floor(x + posx), Math.floor( scaley * -f + y ) , 1, 1 );
				//ctx.fillRect( Math.floor(x + posx) + 0.5, y + 0.5, 0.5, Math.floor( scaley * -f ) + 0.5  );
			posx += 1;
		}
		*/
	}
	else
	{
		ctx.strokeStyle = line_color || "#AFA";
		ctx.beginPath();
		ctx.moveTo(x,y);
		for(var i = 0; i < l; i+=delta)
		{
			var f = Math.clamp( samples[i|0] / amplitude, min, 1);
			ctx.lineTo( x + posx, Math.floor( scaley * -f + y ) + 0.5 );
			posx += 1;
		}
		ctx.stroke();
	}

	ctx.strokeStyle = "white";
	ctx.strokeRect( (x|0) + 0.5, (starty|0) + 0.5, w, h);
}

SIDRender.prototype.renderADSR = function( x,y, w,h, envelope, line_color )
{
	y = y|0;

	ctx.strokeStyle = "white";
	ctx.strokeRect(x+0.5,y+0.5,w,h-1);

	var f = 2;

	var posx = x+4;
	var posy = 0;

	ctx.fillStyle = "#333";
	ctx.strokeStyle = "white";

	ctx.beginPath();
	ctx.moveTo( posx, y + (h-2) );
	posx += envelope.attack * f;
	ctx.lineTo(posx, y + 2 );
	posx += envelope.decay * f;
	posy = y+(h-2) - (envelope.sustain/15) * (h-2);
	ctx.lineTo(posx, posy - 0.5 );
	posx += 20;
	ctx.lineTo(posx, posy - 0.5 );
	posx += envelope.release * f;
	if(	posx > x+w-4)
		posx = x+w-4;
	ctx.lineTo(posx, y+(h-2) - 0.5 );
	ctx.closePath();
	ctx.fill();
	ctx.stroke();


	ctx.save();
	ctx.fillStyle = "#AAA";
	ctx.font = "10px Courier New";

	ctx.fillText( "A" + envelope.attack, x + 0.5, y+h+14);
	ctx.fillText( "D" + envelope.decay, x + 24, y+h+14);
	ctx.fillText( "S" + envelope.sustain, x + 46, y+h+14);
	ctx.fillText( "R" + envelope.release, x + 70, y+h+14);

	ctx.restore();


	/*
	var text = [];
	text.push( "A: " + envelope.attack.toString() );
	text.push( "D: " + envelope.decay.toString() );
	text.push( "S: " + envelope.sustain.toString() );
	text.push( "R: " + envelope.release.toString() );
	for(var i = 0; i < text.length; ++i )
		ctx.fillText( text[i], x, y + i*14);
	*/

	if( envelope.gate )
	{
		ctx.fillStyle = "white";
		ctx.fillRect( x, y, -6, h );
	}

}

SIDRender.prototype.bindEvents = function()
{
	var canvas = this.canvas;

	document.addEventListener("mousedown", this.onMouse.bind(this) );
	document.addEventListener("mousemove", this.onMouse.bind(this) );
	document.addEventListener("mouseup", this.onMouse.bind(this) );
}

SIDRender.prototype.onMouse = function(e)
{
	var x = e.offsetX;
	var y = e.offsetY;

	e.deltaX = x - this._last_mouse[0];
	e.deltaY = y - this._last_mouse[1];
	this._last_mouse[0] = x;
	this._last_mouse[1] = y;

	if( e.type == "mousedown" )
	{

		this.active_trigger = null;
		for(var i = 0; i < this.triggers.length; ++i)
		{
			var t = this.triggers[i];
			if( x < t[0] || x > (t[0] + t[2]) ||
				y < t[1] || y > (t[1] + t[3]) )
				continue;
			e.localX = x - t[0];
			e.localY = y - t[1];
			this.triggerEvent( t[4], t[5], e );
			this.active_trigger = t;
			break;
		}
	}
	else if( e.type == "mousemove" )
	{
		if( this.active_trigger )
		{
			var t = this.active_trigger;
			e.localX = x - t[0];
			e.localY = y - t[1];
			if(t[6]) //draggable
				this.triggerEvent( t[4], t[5], e );
		}
		else
		{
			this.over_trigger = false;
			this.canvas.style.cursor = "";
			for(var i = 0; i < this.triggers.length; ++i)
			{
				var t = this.triggers[i];
				if( x < t[0] || x > (t[0] + t[2]) ||
					y < t[1] || y > (t[1] + t[3]) )
					continue;
				this.over_trigger = t;
				this.canvas.style.cursor = "pointer";
				break;
			}
		}
	}
	else if( e.type == "mouseup" )
	{
		this.active_trigger = null;
	}
}

SIDRender.prototype.addTrigger = function(x,y,w,h,action,param, draggable)
{
	this.triggers.push([x,y,w,h,action,param, draggable]);
}

SIDRender.prototype.triggerEvent = function( type, param, e )
{
	if( type == "mute_voice" )
	{
		var voice = this.synth.voice[ param ];
		voice.mute( !voice.muted );
	}
	else if( type == "lock" )
	{
		this.synth.ignore_commands = !this.synth.ignore_commands;
	}
	else if( type == "lock_waveform" )
	{
		var voice = this.synth.voice[ param ];
		voice.wave.ignore_waveform = !voice.wave.ignore_waveform;
	}
	else if( type == "set_waveform" )
	{
		var voice = this.synth.voice[ param[0] ];
		var waveform = param[1];

		if(e.shiftKey)
		{
			voice.wave.waveform = waveform;
		}
		else
		{
			if( voice.wave.waveform & waveform )
				voice.wave.waveform &= ~waveform;
			else
				voice.wave.waveform |= waveform;
		}
	}
	else if( type == "lock_filter" )
	{
		this.synth.filter.ignore_commands = !this.synth.filter.ignore_commands;
	}
	else if ( type == "toggle_filter" )
	{
		var voice_num = param;
		var mask = (1<<voice_num);
		if( this.synth.filter.filt & mask )
			this.synth.filter.filt &= ~mask;
		else
			this.synth.filter.filt |= mask;
	}
	else if ( type == "global_filter" )
	{
		this.synth.filter.enabled = !this.synth.filter.enabled;
	}
	else if ( type == "set_filter" )
	{
		var f = Math.clamp(1.0 - e.localY / param[1],0,2);
		this.synth.filter.fc = (f*1600)|0;
		this.synth.filter.res = (24 * Math.clamp(e.localX / param[0],0,1) )|0;
		this.synth.filter.set_w0();
		this.synth.filter.set_Q();
	}
	else if ( type == "filter_freq" )
	{
		this.synth.filter.fc = Math.max( 0, this.synth.filter.fc + (e.deltaX - e.deltaY)*5 );
		this.synth.filter.set_w0();
	}
	else if ( type == "filter_res" )
	{
		this.synth.filter.res = Math.max( 0, this.synth.filter.res + (e.deltaX - e.deltaY)*0.1 );
		this.synth.filter.set_Q();
	}
	else if ( type == "filter_vol" )
	{
		this.synth.filter.vol = Math.clamp( 0, this.synth.filter.vol + (e.deltaX - e.deltaY) *0.1, 30 );
	}
	else if ( type == "filter_type" )
	{
		if(	this.synth.filter.hp_bp_lp & param )
			this.synth.filter.hp_bp_lp &= ~param;
		else
			this.synth.filter.hp_bp_lp |= param;
	}
	else if ( type == "play" )
	{
		this.player.play();
	}
	else if ( type == "stop" )
	{
		this.player.stop();
	}
	else if ( type == "next" )
	{
		if(this.player.nextTrack)
			this.player.nextTrack();
		this.player.play();
	}
	else if ( type == "prev" )
	{
		if(this.player.prevTrack)
			this.player.prevTrack();
		this.player.play();
	}
	else if ( type == "playlist" )
	{
		this.playlist.visible = !this.playlist.visible;
	}
	else if ( type == "HQ" )
	{
		this.player.synth.sampling = this.player.synth.sampling == jsSID.ReSID.sampling_method.SAMPLE_RESAMPLE_INTERPOLATE ? jsSID.ReSID.sampling_method.SAMPLE_FAST : jsSID.ReSID.sampling_method.SAMPLE_RESAMPLE_INTERPOLATE;
	}
	else if ( type == "LIVE" )
	{
		this.liveMode();
	}
	else
	{
		if(this.onEvent)
			this.onEvent( type, param, e );
	}
}

SIDRender.prototype.fillTextV = function(text,x,y,w,h,color)
{
	var ctx = this.ctx;
	ctx.save();
	ctx.translate( x, y + h );
	ctx.fillStyle = color || "white";
	ctx.rotate( Math.PI * -0.5 );
	ctx.fillRect(-1,3,h+1,w);
	ctx.fillStyle = "black";
	ctx.fillText(text,4,14);
	ctx.restore();
}

SIDRender.getWaveString = function(wave)
{
	switch(wave)
	{
		case 0x0:
			return "____";
		case 0x1:
			return "___T";
		case 0x2:
			return "__S_";
		case 0x3:
			return "__ST";
		case 0x4:
			return "_P__";
		case 0x5:
			return "_P_T";
		case 0x6:
			return "_PS_";
		case 0x7:
			return "_PST";
		case 0x8:
			return "N___";
		case 0x9:
			return "N__T";
		case 0xa:
			return "N_S_";
		case 0xb:
			return "N_ST";
		case 0xc:
			return "NP__";
		case 0xd:
			return "NP_T";
		case 0xe:
			return "NPS_";
		case 0xf:
			return "NPST";
	}
	return "";
}

SIDRender.getFilterString = function(filt)
{
	var off = " ";
	var voice1 = "1";
	var voice2 = "2";
	var voice3 = "3";
	var ext_in = "E";
	var result = "";

	result += filt & 0x1 ? voice1 : off;
	result += filt & 0x2 ? voice2 : off;
	result += filt & 0x4 ? voice3 : off;
	result += filt & 0x8 ? ext_in : off;

	return result;
}

SIDRender.prototype.createIcons = function()
{
	var w = 64;
	var h = 20;

	var canvas = document.createElement("canvas");
	canvas.width = w;
	canvas.height = h;
	var ctx = canvas.getContext("2d");

	//saw
	ctx.clearRect(0,0,w,h);
	ctx.strokeStyle = "white"
	ctx.strokeRect(0.5,0.5,w-1,h-1);
	ctx.beginPath();
		ctx.moveTo(i, h*0.5 );
	for(var i = 0; i < w; ++i)
		ctx.lineTo(i, 2 + ((i * 0.05) % 1) * (h-4));
		//ctx.lineTo(i, h*0.5 + Math.sin( (i/w) * Math.PI * 2 ) * -h*0.5);
	ctx.stroke();
	var img = new Image();
	img.src = canvas.toDataURL();
	this.icons["S"] = img;

	//triangle
	ctx.clearRect(0,0,w,h);
	ctx.strokeStyle = "white"
	ctx.strokeRect(0.5,0.5,w-1,h-1);
	ctx.beginPath();
		ctx.moveTo(0, h*0.5 );
	for(var i = 0; i < w; ++i)
	{
		var f = (i*0.05);
		var osc = f-(f%1);
		ctx.lineTo(i, 2 + (osc%2 == 0 ? (f%1) : (1-(f%1))) * (h-4));
	}
	ctx.stroke();
	var img = new Image();
	img.src = canvas.toDataURL();
	this.icons["T"] = img;

	//pulse
	ctx.clearRect(0,0,w,h);
	ctx.strokeStyle = "white"
	ctx.strokeRect(0.5,0.5,w-1,h-1);
	ctx.beginPath();
		ctx.moveTo(0, 0 );
	for(var i = 0; i < w; ++i)
		ctx.lineTo(i, Math.floor(4 + (((i * 0.025) % 1) > 0.5 ? 1 : 0) * (h - 8)) + 0.5 );
	ctx.stroke();
	var img = new Image();
	img.src = canvas.toDataURL();
	this.icons["P"] = img;

	//noise
	ctx.clearRect(0,0,w,h);
	ctx.strokeStyle = "white"
	ctx.strokeRect(0.5,0.5,w-1,h-1);
	ctx.beginPath();
		ctx.moveTo(0, h*0.5 );
	for(var i = 0; i < w; ++i)
		ctx.lineTo(i, Math.random() * (h-4) + 2 );
	ctx.stroke();
	var img = new Image();
	img.src = canvas.toDataURL();
	this.icons["N"] = img;

}

SIDRender.prototype.setPlaylist = function(v)
{
	this.playlist.songs = v;
}

//for performance
SIDRender.prototype.liveMode = function()
{
	var synth = this.synth;

	if(	synth.ignore_commands )
	{
		synth.ignore_commands = false;
		return;
	}

	synth.ignore_commands = true;
	synth.reset();
	synth.filter.vol = 15;
	for(var i = 0; i < 3; ++i)
	{
		var voice = this.synth.voice[i];
		voice.wave.freq = 0;
		voice.wave.pw = 1000;
		voice.wave.waveform = 0x1;
		voice.envelope.attack = 2;	
		voice.envelope.decay = 5;	
		voice.envelope.sustain = 5;	
		voice.envelope.release = 8;	
	}


	//synth.voice[1].envelope.attack = 2;	
	//synth.voice[1].envelope.decay = 3;	
	//synth.voice[1].envelope.sustain = 3;	
	//synth.voice[1].envelope.release = 4;	

}

Math.clamp = function(v,a,b) {
	if(v < a)
		return a;
	if( v < b )
		return v;
	return b;
}

function trimString( str )
{
	for(var i = 0; i < str.length; ++i)
	{
		if( str.charCodeAt(i) == 0 )
			return str.substr(0,i);
	}
	return str;
}