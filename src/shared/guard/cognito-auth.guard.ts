import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtRsaVerifier } from 'aws-jwt-verify';
import { JwtExpiredError } from 'aws-jwt-verify/error';
import { TranslationService } from '../service/translation.service';
import { JwtRsaVerifierSingleIssuer } from 'aws-jwt-verify/jwt-rsa';

@Injectable()
export class CognitoAuthGuard implements CanActivate {
  verifier: JwtRsaVerifierSingleIssuer<{
    issuer: string;
    audience: string;
    jwksUri: string;
  }>;
  constructor(
    private readonly configService: ConfigService,
    private readonly translationService: TranslationService,
  ) {
    this.verifier = JwtRsaVerifier.create({
      issuer: this.configService.get('AWS_COGNITO_AUTHORITY'),
      audience: this.configService.get('AWS_COGNITO_CLIENT_ID'),
      jwksUri: `${this.configService.get('AWS_COGNITO_AUTHORITY')}/.well-known/jwks.json`,
    });
  }

  private logger: Logger = new Logger(CognitoAuthGuard.name);

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const headers = request.headers;
    const authorization = headers['authorization'];
    let authorizationString = '';
    if (Array.isArray(authorization)) {
      authorizationString = authorization[0];
    } else {
      authorizationString = authorization;
    }
    try {
      const payload = await this.verifier.verify(authorization.replace('Bearer ', ''));
      request['user'] = { ...payload, username: payload['cognito:username'] };
      return true;
    } catch (err) {
      this.logger.error(`Unauthorized request: ${err.message}`);
      if (err instanceof JwtExpiredError)
        throw new HttpException(
          await this.translationService.translate('TOKEN_EXPIRED', request),
          HttpStatus.FORBIDDEN,
        );
      throw new HttpException(
        await this.translationService.translate('UNAUTHORIZED', request),
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
