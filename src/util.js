function formatBytes(bytes, decimals = 2) {
	if (!+bytes) return '0 Bytes'
	const k = 1024
	const dm = decimals < 0 ? 0 : decimals
	const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

function makeReadableList(list) {
	if (list.length === 0) return ''
	if (list.length === 1) return list[0]
	if (list.length === 2) return `${list[0]} and ${list[1]}`
	const copy = [...list]
	copy[copy.length - 1] = `and ${copy[copy.length - 1]}`
	return copy.join(', ')
}

function capitalizeFirstLetter(token) {
	return token.charAt(0).toUpperCase() + token.slice(1);
}

function truncateString(string, limit = 96) {
	if (string.length < limit) return string
	return string.slice(0, limit - 3) + '...'
}

function checkFieldsAreDefined(obj, fields) {
	for (const field of fields) {
		if (obj[field] === undefined) throw new Error(`Field ${field} undefined`)
	}
}

module.exports = {
	formatBytes,
	makeReadableList,
	capitalizeFirstLetter,
	truncateString,
	checkFieldsAreDefined,
}
