import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filter',
  standalone: true
})
export class FilterPipe implements PipeTransform {
  transform(items: any[], field: string, value: any): any[] {
    // Protección contra valores undefined o null
    if (!items || !Array.isArray(items)) {
      return [];
    }
    if (!field) {
      return items;
    }
    return items.filter(item => item && item[field] === value);
  }
}

