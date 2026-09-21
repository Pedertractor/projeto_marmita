import { env } from '../env/index.js';
import { HttpError } from '../https/errors/index.js';
import type { $Enums } from '../generated/prisma/client.js';
import type { PedertractorEmployee } from '../types/pedertractor-employee.js';

export class ApiPedertractorEmployee {
  private assertConfigured() {
    if (!env.API_PEDERTRACTOR_URL || !env.APPNAME || !env.APPKEY) {
      throw new HttpError(
        'Integração com a API corporativa não configurada',
        503,
      );
    }
  }

  async getEmployee({
    cardNumber,
    unit,
  }: {
    cardNumber: string;
    unit: $Enums.Unit;
  }): Promise<PedertractorEmployee> {
    this.assertConfigured();

    const baseUrl = env.API_PEDERTRACTOR_URL.replace(/\\/g, '/').replace(
      /\/$/,
      '',
    );
    const response = await fetch(
      `${baseUrl}/employee/get/${encodeURIComponent(cardNumber)}/${unit}`,
      {
        method: 'GET',
        headers: {
          nameapplication: env.APPNAME,
          key: env.APPKEY,
        },
      },
    );

    if (response.status !== 200) {
      throw new HttpError(
        `Não foi possível buscar o colaborador na API corporativa. Status: ${response.status}`,
        response.status >= 400 && response.status < 600 ? response.status : 502,
      );
    }

    const data = (await response.json()) as PedertractorEmployee;
    return data;
  }
}
