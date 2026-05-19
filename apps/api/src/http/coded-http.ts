import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import type { ApiErrorCode } from 'contracts';

/** Nest-friendly exceptions with stable `code` for clients (see `AllExceptionsFilter`). */
export function codedBadRequest(
  code: ApiErrorCode,
  message: string,
  details?: unknown,
): HttpException {
  return new BadRequestException(
    details !== undefined ? { code, message, details } : { code, message },
  );
}

export function codedUnauthorized(
  code: ApiErrorCode,
  message: string,
): HttpException {
  return new UnauthorizedException({ code, message });
}

export function codedForbidden(
  code: ApiErrorCode,
  message: string,
): HttpException {
  return new ForbiddenException({ code, message });
}

export function codedNotFound(
  code: ApiErrorCode,
  message: string,
): HttpException {
  return new NotFoundException({ code, message });
}

export function codedConflict(
  code: ApiErrorCode,
  message: string,
): HttpException {
  return new ConflictException({ code, message });
}

export function codedServiceUnavailable(
  code: ApiErrorCode,
  message: string,
): HttpException {
  return new ServiceUnavailableException({ code, message });
}

export function codedInternalError(
  code: ApiErrorCode,
  message: string,
): HttpException {
  return new InternalServerErrorException({ code, message });
}

export function codedTooManyRequests(
  code: ApiErrorCode,
  message: string,
): HttpException {
  return new HttpException({ code, message }, HttpStatus.TOO_MANY_REQUESTS);
}
