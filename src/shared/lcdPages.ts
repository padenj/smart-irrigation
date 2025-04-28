import { Entity, Fields, IdEntity } from 'remult';

@Entity('lcdPages', {
    allowApiCrud: true
})
export class LcdPage extends IdEntity {
    @Fields.integer()
    pageNumber = 0;

    @Fields.json()
    lines: string[] = [];
}