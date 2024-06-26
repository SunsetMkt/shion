import { type Insertable, type Kysely, sql } from 'kysely'
import { jsonBuildObject } from 'kysely/helpers/sqlite'
import psl from 'psl'

import type { DB, History as TransformHistory } from '../transform-types'
import { Model, get, injectModel, set } from './model'
import { Domain } from './domain'

@injectModel({
  relation: {
    domain: Domain,
  },
})
export class History extends Model<TransformHistory> {
  table = 'history' as const

  #domain: Domain

  constructor(kysely: Kysely<DB>, domain: Domain) {
    super(kysely)
    this.#domain = domain
  }

  batchInsert(@set value: Array<Omit<Insertable<TransformHistory>, 'domainId'>>) {
    return this.transaction().execute(async (trx) => {
      const patternSet = new Set<string>()
      for (const item of value) {
        const pattern = psl.get(new URL(item.url).hostname)
        if (pattern)
          patternSet.add(pattern)
      }
      const patternDomainMap = new Map<string, number>()
      for (const pattern of patternSet) {
        const domain = (await trx.domain.select({
          pattern,
        })).pop()
        if (domain) {
          patternDomainMap.set(pattern, domain.id)
        }
        else {
          const { lastInsertId } = await trx.domain.insert({
            name: pattern,
            color: randomColor(),
            pattern,
          })
          await trx.domain.update(lastInsertId, {
            sort: lastInsertId,
          })
          patternDomainMap.set(pattern, lastInsertId)
        }
      }
      for (const item of value) {
        const pattern = psl.get(new URL(item.url).hostname)
        if (!pattern)
          continue

        const domainId = patternDomainMap.get(pattern)
        if (!domainId)
          continue

        const { title, url, lastVisited } = item

        await trx.history.insert({
          title,
          url,
          lastVisited,
          domainId,
        })
      }
    })
  }

  @get()
  select(value?: { id?: number; domainId?: number; start?: number; end?: number; keyword?: string; page?: number; size?: number }) {
    let query = this.kysely.with('d', () => this.#domain.select()).selectFrom(['history', 'd']).where('history.deletedAt', '=', 0).where(sql`length(title)`, '!=', 0)
    if (value?.domainId)
      query = query.where('domainId', '=', value.domainId)
    if (value?.start)
      query = query.where('history.lastVisited', '>', value.start)
    if (value?.end)
      query = query.where('history.lastVisited', '<', value.end)
    if (value?.keyword)
      query = query.where('history.title', 'like', `%${value.keyword}%`).orderBy('history.lastVisited desc')
    if (value?.page && value?.size)
      query = query.offset((value.page - 1) * value.size).limit(value.size)
    return query.select(eb =>
      jsonBuildObject({
        id: eb.ref('d.id'),
        name: eb.ref('d.name'),
        color: eb.ref('d.color'),
        pattern: eb.ref('d.pattern'),
        sort: eb.ref('d.sort'),
        deletedAt: eb.ref('d.deletedAt'),
        createdAt: eb.ref('d.createdAt'),
        updatedAt: eb.ref('d.updatedAt'),
        itemCount: eb.ref('d.itemCount'),
      }).as('domain'),
    ).selectAll(this.table).whereRef('history.domainId', '=', 'd.id')
  }

  @get(false)
  count(value?: { keyword?: string }) {
    let query = this.selectByLooseType()
    if (value?.keyword)
      query = query.where('history.title', 'like', `%${value.keyword}%`)
    return query.select(sql<number>`ifnull(count(*), 0)`.as('count'))
  }

  paginationSelect(value: { keyword?: string; page: number; size: number }) {
    const { page, size } = value
    return this.transaction().execute(async (trx) => {
      const [{ count }] = await trx.history.count(value)
      const list = await trx.history.select(value)
      return {
        list,
        next: count > page * size,
        count,
      }
    })
  }
}
