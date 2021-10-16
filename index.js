#!/usr/bin/env node

/**
 * snmp-cli
 * Command Line Interface utility to retrive snmp informations
 *
 * @author stefano.pompa@gmail.com <https://github.com/steledama/snmp-cli.git>
 */

const init = require('./utils/init');
const cli = require('./utils/cli');
const log = require('./utils/log');

const input = cli.input;
const flags = cli.flags;
const { clear, debug } = flags;

// To comunicate with snmp devices
const snmp = require('net-snmp');
// to write file
const fs = require('fs');

(async () => {
	init({ clear });
	input.includes(`help`) && cli.showHelp(0);
	debug && log(flags);

	// snmp-cli
	if (!input[0]) {
		console.log('You need to pass the ip address as first argument');
	}
	if (!input[1]) {
		console.log(
			'The second argument must be get or subtree method. Default value is get method'
		);
		if (!input[2]) {
			console.log(
				'The third argument must be a valid oid. Default value for get method is 1.3.6.1.2.1.1.5.0'
			);
			let getResult = await get(input[0], ['1.3.6.1.2.1.1.5.0']);
			console.log(getResult);
			return;
		}
		let getResult = await get(input[0], [input[2]]);
		console.log(getResult);
	}
	if (input[1] !== 'subtree' && input[1] !== 'get' && input[1] !== 'bulk') {
		console.log('The second argument must be get or subtree method');
		return;
	}
	if (input[1] === 'subtree') {
		if (!input[2]) {
			console.log(
				'The third argument must be a valid oid. Default value for subtree method is 1.3.6.1.2.1'
			);
			let subtreeResult = await subtree(input[0], '1.3.6.1.2.1');
			return;
		}
		let subtreeResult = await subtree(input[0], input[2]);
		console.log(subtreeResult);
	}
})();

function writeResult(result) {
	try {
		fs.writeFileSync('snmp.json', JSON.stringify(result, null, 4));
		return 'File saved';
	} catch (err) {
		return err;
	}
}

async function get(ip, oidsArray) {
	new Promise((resolve, reject) => {
		const session = snmp.createSession(ip);
		session.get(oidsArray, (error, varbinds) => {
			const finalResult = [];
			if (error) {
				reject(error);
			} else {
				for (const varbind of varbinds)
					if (snmp.isVarbindError(varbind))
						reject(snmp.varbindError(varbind));
					else {
						const snmpResult = {
							oid: varbind.oid.toString(),
							value: varbind.value.toString()
						};
						finalResult.push(snmpResult);
					}
				console.log(finalResult);
				resolve(finalResult);
			}
		});
		session.trap(snmp.TrapType.LinkDown, error => {
			if (error) reject(error);
		});
	});
}

async function subtree(ip, oid) {
	new Promise((resolve, reject) => {
		const finalResult = [];
		const maxRepetitions = 20;
		const options = {};
		const session = snmp.createSession(ip, 'public', options);
		const feedCb = varbinds => {
			for (const varbind of varbinds) {
				const snmpResult = {
					oid: varbind.oid.toString(),
					value: varbind.value.toString()
				};
				finalResult.push(snmpResult);
			}
			console.log(finalResult);
			return finalResult;
		};
		session.subtree(oid, maxRepetitions, feedCb, error => {
			if (error) {
				reject(error);
			} else {
				console.log(finalResult);
				resolve(finalResult);
			}
		});
	});
}
