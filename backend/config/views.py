from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view
from rest_framework.response import Response


@extend_schema(
    tags=["health"],
    summary="Smoke test da API",
    description="Confirma que o backend está no ar. Não depende de banco de dados.",
    responses={200: {"type": "object", "properties": {"status": {"type": "string"}}}},
)
@api_view(["GET"])
def health_check(request):
    return Response({"status": "ok"})
