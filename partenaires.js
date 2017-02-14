#!/bin/env node
var http = require('http');
var https = require('https');
var fs = require('fs');
var xml2js = require('xml2js');
var querystring = require('querystring');
var util = require('util');
var tls = require('tls');

var EventEmitter = require('events').EventEmitter;

/**
* Fonction d'héritage : un objet source hérite d'un objet destination
*/
function heriter(destination, source) { 
	for (var element in source) { 
		destination[element] = source[element]; 
	} 
} 

/**
* "Classe" Abstraite
*/
function AbstractPartenaire() { 
} 
AbstractPartenaire.prototype = { 
	callPartenaire: function(ressource, parametres) { 
		var partenaireEvent = new EventEmitter();
    	// controle des parametres d'entrée
    	this.checkInput(parametres, ressource);
		// mapping des parametres d'entée en XML
		var paramsXml = this.createXmlInput(parametres);
        // creation des options pour l'appel au partenaire
        var options = this.createHttpOptions(ressource, paramsXml);
		// appel au partenaire
		var req = https.request(options, function(res) {
			console.log(ressource + ' Response STATUS: ' + res.statusCode);
			console.log(ressource + ' Response HEADERS: ' + JSON.stringify(res.headers));
			res.setEncoding('utf8');
			var body = '';
			// l'evenement 'data' peut survenir plusieurs fois pour un appel => '+='
			res.on('data', function (chunk) {
				body += chunk;
			});
			res.on('end', function() {
				console.log(ressource + ' Response BODY: ' + body);
				if (res.statusCode == 200) {
			  		// convertion de la reponse xml en json
			  		var parser = new xml2js.Parser();
			  		parser.parseString(body, function (err, result) {
			  			if (typeof result != 'undefined' && result != null) {
			  				console.log('JsonResponse => ' + JSON.stringify(result));
			  				partenaireEvent.emit('onSuccess', result);
			  			} else {
			  				partenaireEvent.emit('onError', 502, "le partenaire (" + ressource + ") n'a retourné aucune données");
			  			}
			  		});
			  	} else {
			  		partenaireEvent.emit('onError', res.statusCode, "Erreur lors de l'appel au partenaire (" + ressource + ")");
			  	}
			  });
		});
		// on renseigne les données à passer en post
		req.write(paramsXml);

		req.end();
		req.on('error', function(e) {
			console.error(e);
			partenaireEvent.emit('onError', 500, "Erreur lors de l'appel au partenaire (" + ressource + ")");
		});
		return partenaireEvent;
	} ,
	createHttpOptions : function(ressource, post_data) {
		var agent = new HttpsProxyAgent({
			proxyHost: 'proxy.kermit.rd.francetelecom.fr',
			proxyPort: 3128
		})
		var options = {
			host: 'www.demo.almerys.com',
			port: 443, //8080, 
			path: '/esignrest/restserver/sosh/' + ressource, 
			method: 'POST', 
			agent: agent,
			headers: {
				'Content-Type': 'application/xml', //'application/x-www-form-urlencoded',
				'Content-Length': post_data.length,
				'Authorization': 'Basic d3NkZW1vOkFsbWVyeXMw'
			}
		};
		console.log("Appel sur : " + options.path);
		return options;
	}
} 


/**
* "Classe" CreateProcess héritant de AbstractPartenaire
*/
function CreateProcess() {
} 

CreateProcess.prototype = {
	checkInput: function(parametres, ressource) {
		if (parametres == null  
			|| (typeof parametres.email == 'undefined' ||  parametres.email == null) 
			|| (typeof parametres.phoneNumber == 'undefined' ||  parametres.phoneNumber == null)) {
			throw new Error("les parametres fournis pour l'appel au partenaire (" + ressource + ") sont incorrectes");
	}
}, 
createXmlInput: function(parametres) { 
	var json = {
		createProcessRequest : {
			"$" : {
				"xmlns" : "http://www.almerys.com/signature/sosh"
			},
			workflowDefinition : 'soshmaster',
			processType : 'offre',
			signatory : {
				civility : 'M',
				firstname : 'Jean',
				lastname : 'Salzemann',
				contactMail : parametres.email, 
				contactPhoneNumber : parametres.phoneNumber,
				order: 1
			}
		}
	};
	var builder = new xml2js.Builder();
	var xml = builder.buildObject(json);
	console.log('xml createProcessRequest : ' + xml);
	return xml;
}
}  

/**
* "Classe" SendOTP héritant de AbstractPartenaire
*/
function SendOTP() {
} 

SendOTP.prototype = { 
	checkInput: function(parametres, ressource) {
		if (parametres == null 
			|| (typeof parametres.email == 'undefined' || parametres.email == null) 
			|| (typeof parametres.phoneNumber == 'undefined' || parametres.phoneNumber == null)
			|| (typeof parametres.processId == 'undefined' || parametres.processId == null)
			|| (typeof parametres.signatoryId == 'undefined' || parametres.signatoryId == null)) {
			throw new Error("les parametres fournis pour l'appel au partenaire (" + ressource + ") sont incorrectes");
	}
}, 
createXmlInput: function(parametres) { 
	var json = {
		sendOTPRequest : {
			"$" : {
				"xmlns" : "http://www.almerys.com/signature/sosh"
			},
			processId : parametres.processId,
			signatoryId : parametres.signatoryId,
			contactMail : parametres.email,
			contactPhoneNumber : parametres.phoneNumber,
			otpMediaFlag : '2'
		}
	};
	var builder = new xml2js.Builder();
	var xml = builder.buildObject(json);
	console.log('xml SendOtpRequest : ' + xml);
	return xml;
} 
} 

/**
* "Classe" ValidateOTP héritant de AbstractPartenaire
*/
function ValidateOTP() {
} 

ValidateOTP.prototype = { 
	checkInput: function(parametres, ressource) {
		if (parametres == null 
			|| (typeof parametres.otpValue == 'undefined' || parametres.otpValue == null) 
			|| (typeof parametres.processId == 'undefined' || parametres.processId == null)
			|| (typeof parametres.signatoryId == 'undefined' || parametres.signatoryId == null)) {
			throw new Error("les parametres fournis pour l'appel au partenaire (" + ressource + ") sont incorrectes");
	}
}, 
createXmlInput: function(parametres) { 
	var json = {
		validateOTPRequest : {
			"$" : {
				"xmlns" : "http://www.almerys.com/signature/sosh"
			},
			processId : parametres.processId,
			signatoryId : parametres.signatoryId,
			otpValue : parametres.otpValue
		}
	};
	var builder = new xml2js.Builder();
	var xml = builder.buildObject(json);
	console.log('xml ValidateOtpRequest : ' + xml);
	return xml;
} 
} 
/**
* "Classe" SignProcess héritant de AbstractPartenaire
*/
function SignProcess() {
} 

SignProcess.prototype = { 
	checkInput: function(parametres, ressource) {
		if (parametres == null 
			|| (typeof parametres.processId == 'undefined' || parametres.processId == null)
			|| (typeof parametres.signatoryId == 'undefined' || parametres.signatoryId == null)) {
			throw new Error("les parametres fournis pour l'appel au partenaire (" + ressource + ") sont incorrectes");
	}
}, 
createXmlInput: function(parametres) { 
	var json = {
		signProcessRequest : {
			"$" : {
				"xmlns" : "http://www.almerys.com/signature/sosh"
			},
			processId : parametres.processId,
			signatoryId : parametres.signatoryId,
		}
	};
	var builder = new xml2js.Builder();
	var xml = builder.buildObject(json);
	console.log('xml signProcessRequest : ' + xml);
	return xml;
} 
} 

/**
* "Classe" AddDocument héritant de AbstractPartenaire
*/
function AddDocuments() {
} 

AddDocuments.prototype = { 
	checkInput: function(parametres, ressource) {
		if (parametres == null || typeof parametres.processId == 'undefined' || parametres.processId == null) {
			throw new Error("les parametres fournis pour l'appel au partenaire (" + ressource + ") sont incorrectes");
		}
	}, 
	createXmlInput: function(parametres) { 
		var json = {
			addDocumentsRequest : {
				"$" : {
					"xmlns" : "http://www.almerys.com/signature/sosh"
				},
				processId : parametres.processId,
				documentInfo : {
					alias : 'mondocument',
					documentURI : 'MOCK',
					documentSHA1 : 'MOCK'
				}

			}
		};
		var builder = new xml2js.Builder();
		var xml = builder.buildObject(json);
		console.log('xml addDocumentsRequest : ' + xml);
		return xml;
	} 
} 

/**
* Mise en place des héritages entres les différentes 'classe'
*/
heriter(CreateProcess.prototype, AbstractPartenaire.prototype); 
heriter(SendOTP.prototype, AbstractPartenaire.prototype); 
heriter(ValidateOTP.prototype, AbstractPartenaire.prototype); 
heriter(SignProcess.prototype, AbstractPartenaire.prototype);
heriter(AddDocuments.prototype, AbstractPartenaire.prototype); 

var createProcess = new CreateProcess(); 
var sendOTP = new SendOTP(); 
var validateOTP = new ValidateOTP(); 
var signProcess = new SignProcess();
var addDocuments = new AddDocuments();

/**
* Export des méthode d'appel du partenaire
*/
exports.createProcess = function(ressource, parametres) {
	return createProcess.callPartenaire(ressource, parametres);
}
exports.sendOtp = function(ressource, parametres) {
	return  sendOTP.callPartenaire(ressource, parametres);
}
exports.validateOtp = function(ressource, parametres) {
	return  validateOTP.callPartenaire(ressource, parametres);
}
exports.signProcess = function(ressource, parametres) {
	return  signProcess.callPartenaire(ressource, parametres);
}
exports.addDocuments = function(ressource, parametres) {
	return  addDocuments.callPartenaire(ressource, parametres);
}
exports.downloadDocument = function(parametres) {
	var partenaireEvent = new EventEmitter();
	var customPath = '/esignrest/restserver/sosh/downloaddocument/'+ parametres +'/4160/LATEST';

	console.log('Path PDF : ' + customPath);

	var agent = new HttpsProxyAgent({
		proxyHost: 'proxy.kermit.rd.francetelecom.fr',
		proxyPort: 3128
	})

	var options = {
		host: 'www.demo.almerys.com',
		port: 443,
		path: customPath, 
		method: 'GET', 
		agent: agent,
		headers: {
			'Authorization': 'Basic d3NkZW1vOkFsbWVyeXMw'
		}
	};

	var request = https.request(options, function(response) {
		console.log("statusCode: ", response.statusCode);
		console.log("headers: ", response.headers);
		var chunks = [];
		response.on('data', function(chunk) {
        	console.log('downloading');
        	chunks.push(chunk);
      	});
		
		response.on('end', function() {
			console.log('downloaded');
          	var jsfile = new Buffer.concat(chunks).toString('base64');
          	console.log('converted to base64');
			if (response.statusCode == 200) {
				partenaireEvent.emit('onSuccess', jsfile);
			} else {
				partenaireEvent.emit('onError', response.statusCode, "Erreur lors de l'appel au partenaire (/downloaddocument)");
			}
		});
	});
	request.end();
	return partenaireEvent;
}

/********************************************************************************************************************
 * HTTPS Agent for node.js HTTPS requests via a proxy.
 * blog.vanamco.com/connecting-via-proxy-node-js/
 ********************************************************************************************************************/
 function HttpsProxyAgent(options)
 {
 	https.Agent.call(this, options);

 	this.proxyHost = options.proxyHost;
 	this.proxyPort = options.proxyPort;

 	this.createConnection = function(opts, callback)
 	{
        // do a CONNECT request
        var req = http.request({
        	host: options.proxyHost,
        	port: options.proxyPort,
        	method: 'CONNECT',
        	path: opts.host + ':' + opts.port,
        	headers: {
        		host: opts.host
        	}
        });

        req.on('connect', function(res, socket, head)
        {
        	var cts = tls.connect(
        	{
        		host: opts.host,
        		socket: socket
        	},
        	function()
        	{
        		callback(false, cts);
        	}
        	);
        });

        req.on('error', function(err)
        {
        	callback(err, null);
        });

        req.end();
    }
}

util.inherits(HttpsProxyAgent, https.Agent);

// Almost verbatim copy of http.Agent.addRequest
HttpsProxyAgent.prototype.addRequest = function(req, host, port, localAddress)
{
	var name = host + ':' + port;
	if (localAddress)
		name += ':' + localAddress;

	if (!this.sockets[name])
		this.sockets[name] = [];

	if (this.sockets[name].length < this.maxSockets)
	{
        // if we are under maxSockets create a new one.
        this.createSocket(name, host, port, localAddress, req, function(socket)
        {
        	req.onSocket(socket);
        });
    }
    else
    {
        // we are over limit so we'll add it to the queue.
        if (!this.requests[name])
        	this.requests[name] = [];
        this.requests[name].push(req);
    }
};

// Almost verbatim copy of http.Agent.createSocket
HttpsProxyAgent.prototype.createSocket = function(name, host, port, localAddress, req, callback)
{
	var self = this;
	var options = util._extend({}, self.options);
	options.port = port;
	options.host = host;
	options.localAddress = localAddress;

	options.servername = host;
	if (req)
	{
		var hostHeader = req.getHeader('host');
		if (hostHeader)
			options.servername = hostHeader.replace(/:.*$/, '');
	}

	self.createConnection(options, function(err, s)
	{
		if (err)
		{
			err.message += ' while connecting to HTTP(S) proxy server ' + self.proxyHost + ':' + self.proxyPort;

			if (req)
				req.emit('error', err);
			else
				throw err;

			return;
		}

		if (!self.sockets[name])
			self.sockets[name] = [];

		self.sockets[name].push(s);

		var onFree = function()
		{
			self.emit('free', s, host, port, localAddress);
		};

		var onClose = function(err)
		{
            // this is the only place where sockets get removed from the Agent.
            // if you want to remove a socket from the pool, just close it.
            // all socket errors end in a close event anyway.
            self.removeSocket(s, name, host, port, localAddress);
        };

        var onRemove = function()
        {
            // we need this function for cases like HTTP 'upgrade'
            // (defined by WebSockets) where we need to remove a socket from the pool
            // because it'll be locked up indefinitely
            self.removeSocket(s, name, host, port, localAddress);
            s.removeListener('close', onClose);
            s.removeListener('free', onFree);
            s.removeListener('agentRemove', onRemove);
        };

        s.on('free', onFree);
        s.on('close', onClose);
        s.on('agentRemove', onRemove);

        callback(s);
    });
};