export function formatBytes(bytes: number, decimals = 2) {
	if (!+bytes) return '0 Bytes'
	const k = 1024
	const dm = decimals < 0 ? 0 : decimals
	const sizes = ['Bytes', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function makeReadableList(list: string[]) {
	if (list.length === 0) return ''
	if (list.length === 1) return list[0]
	if (list.length === 2) return `${list[0]} and ${list[1]}`
	const copy = [...list]
	copy[copy.length - 1] = `and ${copy[copy.length - 1]}`
	return copy.join(', ')
}

export function capitalizeFirstLetter(token: string) {
	return token.charAt(0).toUpperCase() + token.slice(1);
}

export function truncateString(string: string, limit = 96) {
	if (string.length < limit) return string
	return string.slice(0, limit - 3) + '...'
}

export function checkFieldsAreDefined(obj: Record<string, any>, fields: string[]) {
	for (const field of fields) {
		if (obj[field] === undefined) throw new Error(`Field ${field} undefined`)
	}
}
