import { env } from '../env/index.js';
import { HttpError } from '../https/errors/index.js';
import type { $Enums } from '../generated/prisma/client.js';
import type { PedertractorEmployee } from '../types/pedertractor-employee.js';

const FETCH_TIMEOUT_MS = 8_000;

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

    let response: Response;
    try {
      response = await fetch(
        `${baseUrl}/employee/get/${encodeURIComponent(cardNumber)}/${unit}`,
        {
          method: 'GET',
          headers: {
            nameapplication: env.APPNAME,
            key: env.APPKEY,
          },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        },
      );
    } catch (error) {
      console.error('Falha ao consultar API corporativa:', error);
      throw new HttpError(
        'Não foi possível consultar a base corporativa. Tente novamente.',
        502,
      );
    }

    if (response.status !== 200) {
      console.error(
        'API corporativa retornou status inesperado:',
        response.status,
      );
      throw new HttpError(
        'Não foi possível buscar o colaborador na API corporativa.',
        502,
      );
    }

    const data = (await response.json()) as PedertractorEmployee;
    return data;
  }
}
