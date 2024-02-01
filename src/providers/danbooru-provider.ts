import { type RESTPostAPIWebhookWithTokenJSONBody as Webhook } from 'discord.js/typings'
import { persistence } from '../globals/persistence'

import {
  formatBytes,
  makeReadableList,
  capitalizeFirstLetter,
  truncateString,
  checkFieldsAreDefined
} from '../util/util'

import logger from '../globals/logger'

import { Provider } from './provider'

export interface Options {
  name: string;
  tags: string[];
  interval?: number;
  approvedOnly?: boolean;
  approvalQueueInterval?: number;
}

interface UncheckedBasePostApiResult {
  id: number;
  rating: string;
  source?: string;
  tag_string_artist: string;
  tag_string_character: string;
  tag_string_general: string;
  tag_string_copyright: string;
  created_at?: string;
  image_height?: number;
  image_width?: number;
  file_url?: string;
  preview_file_url?: string;
  file_ext: string;
  file_size: number;
  is_banned?: boolean;
  is_deleted?: boolean;
  is_pending?: boolean;
  is_flagged?: boolean;
}

interface PostData {
  id: number;
  rating: string;
  source: string | null;
  artists: string[];
  characters: string[];
  tags: string[];
  origin: string[];
  createdAt: string;
  height: number | string;
  width: number | string;
  fileUrl: string | null;
  previewUrl: string | null;
  fileExt: string;
  fileSize: number;
  isBanned: boolean;
  isDeleted: boolean;
  isPending: boolean;
  isFlagged: boolean;
  readonly readableArtists: string;
  readonly readableCharacters: string;
  readonly readableOrigin: string;
  readonly readableFileSize: string;
  readonly postUrl: string;
  readonly artistUrl: string;
  readonly dimensions: string;
}

interface ApprovalQueueItem {
  id: number;
  expires: Date;
}

const baseEndpoint = 'https://danbooru.donmai.us'

export default class DanbooruProvider extends Provider {
  tags: string[] = []
	providedTypes: string[] = ['danbooru']
  private lastId: number | null = null
  private timer: ReturnType<typeof setInterval> | null = null
	private approvalQueueTimer: ReturnType<typeof setInterval> | null = null
	private approvalQueue: ApprovalQueueItem[] = []

  constructor(options: Options) {
    super()
    const { name, tags, interval = 120000, approvedOnly = false, approvalQueueInterval = 120000 } = options
    this.args = { name, tags, interval, approvedOnly, approvalQueueInterval }
    this.name = name
    this.tags = tags
  }

  /** Makes booru style tags more human readable, e.g. klee_(genshin_impact) -> Klee */
  private static cleanUpTags(tags: string[]) {
    const tagTokens = tags
      .map(tag => {
        if (tag.endsWith(')')) {
          tag = tag.slice(0, tag.lastIndexOf('(') - 1)
        }
        const tokens = tag.split('_').map(capitalizeFirstLetter)
        return tokens.join(' ')
      })
    return [...new Set(tagTokens)]
  }

  private async getMostRecentPost() {
		const options = []
		if (this.lastId !== null) {
			options.push('order:id')
			options.push(`id:>${this.lastId}`)
		}
		const endpoint = `${baseEndpoint}/posts.json?limit=1&tags=${ [...this.tags, ...options].join('+')}`
		logger.info({ provider: this.name, endpoint }, 'Sending request.')
		try {
			const result = await fetch(endpoint)
			const json = await result.json()
			if ('success' in json && !json.success) {
				logger.error({ provider: this.name, endpoint, json }, 'Unsuccessful fetch.')
				return null
			}
			if (json.length === 0) {
				logger.info({ provider: this.name, endpoint }, 'Got no results.')
				return null
			}
			return json[0] as UncheckedBasePostApiResult
		} catch(e) {
			logger.error(e)
			return null
		}
	}

  private async getPostsWithIds(ids: number[]) {
		const endpoint = `${baseEndpoint}/posts.json?tags=id:${ids.join(',')}`
		logger.info({ provider: this.name, endpoint, ids }, 'Sending request for posts with ids.')
		try {
			const result = await fetch(endpoint)
			const json = await result.json()
			if ('success' in json && !json.success) {
				logger.error({ provider: this.name, endpoint, json }, 'Unsuccessful fetch.')
				return null
			}
			if (json.length === 0) {
				logger.info({ provider: this.name, endpoint }, 'Got no results.')
				return null
			}
			return json as UncheckedBasePostApiResult[]
		} catch(e) {
			logger.error(e)
			return null
		}
	}

  private extractPostInfo(post: UncheckedBasePostApiResult): PostData {
		const expectedFields = ['id', 'rating', 'tag_string_artist', 'tag_string_character', 'tag_string_general', 'tag_string_copyright', 'file_ext', 'file_size'] as (keyof UncheckedBasePostApiResult)[]
		checkFieldsAreDefined(post, expectedFields)
		return {
			id: post.id,
			rating: post.rating,
			source: post?.source ?? null,
			artists: post.tag_string_artist.split(' ').filter((x: string) => x !== ''),
			characters: post.tag_string_character.split(' ').filter((x: string) => x !== ''),
			tags: post.tag_string_general.split(' ').filter((x: string) => x !== ''),
			origin: post.tag_string_copyright.split(' ').filter((x: string) => x !== ''),
			createdAt: post?.created_at ?? (new Date()).toISOString(),
			height: post?.image_height ?? 'Unknown',
			width: post?.image_width ?? 'Unknown',
			fileUrl: post?.file_url ?? null,
			previewUrl: post?.preview_file_url ?? null,
			fileExt: post.file_ext,
			fileSize: post.file_size,
			isBanned: post.is_banned ?? false,
			isDeleted: post.is_deleted ?? false,
			isPending: post.is_pending ?? false,
			isFlagged: post.is_flagged ?? false,
			get readableArtists() { return makeReadableList(DanbooruProvider.cleanUpTags(this.artists)) },
			get readableCharacters() { return makeReadableList(DanbooruProvider.cleanUpTags(this.characters)) },
			get readableOrigin() { return makeReadableList(DanbooruProvider.cleanUpTags(this.origin)) },
			get readableFileSize() { return formatBytes(this.fileSize) },
			get postUrl() { return `${baseEndpoint}/posts/${this.id}` },
			get artistUrl() { return `${baseEndpoint}/posts?tags=${this.artists.join('+')}` },
			get dimensions() { return `${this.width} × ${this.height}` }
		}
	}

  private convertPostToWebhook(postData: PostData): Webhook {
		const embedTitle = `${truncateString(postData.readableCharacters)} from ${truncateString(postData.readableOrigin)}`
		const embedFile = (() => {
			if (['jpg', 'png', 'webp', 'gif', 'sfw'].includes(postData.fileExt)) {
        if (postData.fileUrl === null) return null
				return { image: { url: postData.fileUrl }}
			}
			if (['mp4', 'webm'].includes(postData.fileExt)) {
        if (postData.previewUrl === null) return null
				return { image: { url: postData.previewUrl }}
			}
			if (['zip'].includes(postData.fileExt)) {
				logger.warn(`Ugoira file type not supported`)
				return null
			}
			logger.warn({ provider: name, ext: postData.fileExt }, `Unknown file type`)
			return null
		})()
		const embedArtist = postData.artists.length > 0 ? { description: `By **[${postData.readableArtists}](${postData.artistUrl})**` } : null
		return {
			embeds: [{
				title: embedTitle,
				url: postData.postUrl,
				...embedArtist,
				...embedFile,
				footer: { text: `${postData.dimensions} • ${postData.readableFileSize}` },
				timestamp: postData.createdAt,
			}],
		}
	}

  private async processResponse(post: UncheckedBasePostApiResult, isMostRecent = false) {
		logger.info({ provider: this.name }, 'Parsing raw data into PostInfo.')
		const postInfo = this.extractPostInfo(post)
		logger.info({ provider: this.name, postInfo }, 'Extracted post info.')
		if (isMostRecent) {
			this.lastId = post.id
			logger.info({ provider: this.name, id: post.id, dbKey: `/providers/${name}/lastId` }, 'Writing new post id.')
			await persistence.push(`/extra/danbooru/lastIds/${this.name}`, post.id)
			await persistence.save()
		}
		if (postInfo.isBanned) {
			logger.warn({ provider: this.name, lastId: this.lastId, currId: post.id }, 'This post is banned.')
			return;
		}
		if (postInfo.isDeleted) {
			logger.warn({ provider: this.name, lastId: this.lastId, currId: post.id }, 'This post is deleted')
			return;
		}
		if (postInfo.fileUrl === null || postInfo.previewUrl === null) {
			logger.warn({ provider: this.name, lastId: this.lastId, currId: post.id }, 'FileUrl or PreviewUrl missing. Was the artist banned?')
			return;
		}
		if (this.args.approvedOnly && postInfo.isPending) {
			const expirationDate = new Date()
			expirationDate.setDate(expirationDate.getDate() + 3)
			logger.info({ provider: this.name, id: post.id, expirationDate }, 'Post is pending; appending to approvalQueue.')
			this.approvalQueue.push({
				id: postInfo.id,
				expires: expirationDate,
			})
		} else {
			logger.info({ provider: this.name, id: post.id }, 'Converting post into webhook.')
			const webhook = this.convertPostToWebhook(postInfo)
			this.onProvide({
				provider: {	name: this.name, type: 'danbooru' },
				webhook,
				metadata: {
					raw: post,
					info: postInfo,
				}
			})
		}
	}

  private async runApprovalQueueIteration() {
    logger.info({ provider: this.name, numItems: this.approvalQueue.length }, 'Running approval queue iteration.')
		logger.debug({ provider: this.name, approvalQueue: this.approvalQueue })
		if (this.approvalQueue.length === 0) {
			logger.info({ provider: this.name }, 'Queue empty.')
			return;
		}
		try {
			const numItemsToCheck = Math.min(this.approvalQueue.length, 10)
			const itemsToCheck = this.approvalQueue.slice(0, numItemsToCheck)
			  .filter(({ id, expires }) => {
					const isExpired = Date.now() >= Number(expires)
					if (isExpired) {
						logger.info({ provider: this.name, id, expires }, 'Approval queue item expired.')
					}
					return !isExpired
				})
			this.approvalQueue = this.approvalQueue.slice(numItemsToCheck)
      const targetIds = itemsToCheck.map(({ id }) => id)
		  const posts = await this.getPostsWithIds(targetIds)
      if (posts === null) {
        logger.warn({ provider: this.name, ids: targetIds }, 'Getting posts with ids returned nothing. Has the post somehow gone missing?')
      } else {
        posts.forEach((post) => { this.processResponse(post) })
      }
      logger.info({
        provider: this.name,
        dbKey: '/extra/danbooru/approvalQueue',
        length: this.approvalQueue.length
      }, 'Saving approval queue')
			await persistence.push(`/extra/danbooru/approvalQueue/${this.name}`, this.approvalQueue)
		} catch (err) {
			logger.error({ provider: this.name, err })
		}
	}

	private async runIteration() {
		try {
			logger.info({ provider: this.name, lastId: this.lastId }, 'Running iteration.')
			const post = await this.getMostRecentPost()
      if (post === null) {
        logger.info({ provider: this.name, lastId: this.lastId }, 'Checked but no new items.')
        return;
      }
			this.processResponse(post, true)
		} catch (err: unknown) {
			logger.error({ provider: this.name, err })
		}
	}

  
	async init() {
		logger.info({ provider: this.name }, 'Initializing provider.')
		this.lastId = await persistence.getObjectDefault(`/extra/danbooru/lastIds/${this.name}`, null)
		this.approvalQueue = await persistence.getObjectDefault(`/extra/danbooru/approvalQueue/${this.name}`, [])
	}

  start() {
		if (this.state === 'running') {
      logger.warn({ provider: this.name }, 'Tried to start provider that was already running.')
      return;
    }
		logger.info({ provider: this.name }, 'Starting provider.')
		this.state = 'running'
		this.runIteration()
		this.timer = setInterval(this.runIteration, this.args.interval)
		if (this.args.approvedOnly) {
			this.runApprovalQueueIteration()
			this.approvalQueueTimer = setInterval(
        this.runApprovalQueueIteration,
        Math.floor(this.args.approvalQueueInterval + (this.args.interval / 2)),
      )
		}
	}

  stop() {
    if (this.state === 'idle') {
      logger.warn({ provider: this.name }, 'Tried to stop provider that was already stopped.')
      return;
    }
		logger.info({ provider: name }, 'Stopping provider.')
		this.state = 'idle'
		clearInterval(Number(this.timer))
		if (this.args.approvedOnly) {
			clearInterval(Number(this.approvalQueueTimer))
		}
	}
}
